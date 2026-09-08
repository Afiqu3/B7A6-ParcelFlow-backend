import bcrypt from "bcryptjs";
import type { UploadApiResponse } from "cloudinary";
import crypto from "crypto";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import type {
	IApplyAsRiderPayload,
	IVerifyRiderEmailPayload,
} from "./rider.interface";
import type { IQuery } from "../../interfaces";
import type { RiderProfileWhereInput } from "../../../generated/prisma/models";

const applyAsRider = async (
	payload: IApplyAsRiderPayload,
	vehiclePaper: Express.Multer.File,
) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			email: payload.user.email,
		},
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User Already Exists With This Email",
		);
	}

	const vehiclePaperUploadResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
					},

					async (error, result) => {
						if (error) {
							return reject(error);
						}

						if (!result) {
							return reject(new Error("No result returned from Cloudinary"));
						}

						resolve(result);
					},
				)
				.end(vehiclePaper?.buffer);
		},
	);

	const randomRiderPassword = crypto.randomUUID().slice(0, 8);

	const hashedPassword = await bcrypt.hash(
		randomRiderPassword,
		Number(config.bcrypt_salt_rounds),
	);

	const riderApplication = await prisma.user.create({
		data: {
			...payload.user,
			password: hashedPassword,
			role: Role.RIDER,
			mustChangePassword: true,
			riderProfile: {
				create: {
					name: payload.user.name,
					email: payload.user.email,
					...payload.riderProfile,
					vehiclePaper: vehiclePaperUploadResult.secure_url,
					vehiclePaperPublicId: vehiclePaperUploadResult.public_id,
				},
			},
		},

		include: {
			riderProfile: true,
		},
		omit: { password: true },
	});

	const expirationSeconds = 60 * 60;

	const otpKey = `rider-application-otp:${payload.user.email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/rider-registration-user-otp.ejs",
	);

	const templateData = {
		name: payload.user.name,
		email: payload.user.email,
		password: randomRiderPassword,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: '"ParcelFlow" <noreply@parcelflow.com>',
		to: payload.user.email,
		subject: "Rider Application - Email Verification",
		html,
	});

	return riderApplication;
};

const verifyRiderEmail = async (payload: IVerifyRiderEmailPayload) => {
	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const existingUser = await prisma.user.findUnique({
		where: { email, role: Role.RIDER },
	});

	if (!existingUser) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Rider Application Not Found. Please Apply Again.",
		);
	}

	if (existingUser.emailVerified) {
		throw new AppError(httpStatus.CONFLICT, "Email Already Verified");
	}

	const otpKey = `rider-application-otp:${email}`;

	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"OTP Expired. Your Application Window Has Closed, Please Apply Again.",
		);
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}

	await redisClient.del(otpKey);

	const verifiedUser = await prisma.user.update({
		where: { id: existingUser.id },
		data: { emailVerified: true },
		omit: { password: true },
		include: { riderProfile: true },
	});

	return verifiedUser;
};

const getAllRider = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: RiderProfileWhereInput[] = [];

	//Searching
	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
				{
					licenseNumber: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	if (query.email) {
		andConditions.push({
			email: { contains: query.email, mode: "insensitive" },
		});
	}

	if (query.licenseNumber) {
		andConditions.push({
			licenseNumber: { equals: query.licenseNumber, mode: "insensitive" },
		});
	}

	if (query.applicationStatus) {
		andConditions.push({
			applicationStatus: query.applicationStatus,
		});
	}

	andConditions.push({ user: { role: Role.RIDER }, isDeleted: false });

	const allRiders = await prisma.riderProfile.findMany({
		where: {
			AND: andConditions.length > 0 ? andConditions : undefined,
		},

		take: limit,
		skip: skip,

		orderBy: {
			// sortBy : sortOrder
			[sortBy]: sortOrder,
		},

		include: {
			user: {
				omit: {
					password: true,
				},
			},
		},
	});

	const totalRiderCount = await prisma.riderProfile.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: allRiders,
		meta: {
			page: page,
			limit: limit,
			total: totalRiderCount,
			totalPages: Math.ceil(totalRiderCount / limit),
		},
	};
};

const getRiderProfile = async (riderId: string) => {
	const isRiderExists = await prisma.user.findUnique({
		where: {
			id: riderId,
			role: Role.RIDER,
		},
		omit: {
			password: true,
		},
		include: {
			riderProfile: true,
		},
	});
	if (!isRiderExists) {
		throw new AppError(httpStatus.NOT_FOUND, "Rider Not Found");
	}

	if (!isRiderExists.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "Rider Email Not Verified");
	}

	if (isRiderExists.isDeleted) {
		throw new AppError(httpStatus.BAD_REQUEST, "Rider Account Deleted");
	}

	return isRiderExists;
};

export const RiderService = {
	applyAsRider,
	verifyRiderEmail,
	getAllRider,
	getRiderProfile,
};
