import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import httpStatus from "http-status";
import type { SignOptions } from "jsonwebtoken";
import path from "path";
import { AccountStatus, Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";
import type {
	ILoginUserPayload,
	IRegisterMerchantPayload,
	IVerifyEmailPayload,
} from "./auth.interface";

const registerMerchant = async (payload: IRegisterMerchantPayload) => {
	const { name, password, merchantProfile: merchantData } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	const hashedPassword = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds),
	);

	const expirationSeconds = 5 * 60;

	const otpKey = `merchant-registration-otp:${email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const merchantRegistrationKey = `merchant-registration-data:${email}`;

	const redisUserDataPayload = {
		name,
		email,
		password: hashedPassword,
		merchantProfile: merchantData,
	};

	await redisClient.set(
		merchantRegistrationKey,
		JSON.stringify(redisUserDataPayload),
		{
			expiration: {
				type: "EX",
				value: expirationSeconds,
			},
		},
	);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const templateData = {
		name,
		email,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: '"ParcelFlow" <noreply@parcelflow.com>',
		to: email,
		subject: "Email Verification",
		html,
	});
};

const verifyMerchantEmail = async (payload: IVerifyEmailPayload) => {
	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExist?.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
	}

	if (isUserExist?.emailVerified) {
		throw new AppError(httpStatus.CONFLICT, "Email ALready Verified");
	}

	if (isUserExist?.isDeleted) {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}

	const otpKey = `merchant-registration-otp:${email}`;
	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}

	await redisClient.del(otpKey);

	const merchantRegistrationKey = `merchant-registration-data:${email}`;

	const redisMerchantData = await redisClient.get(merchantRegistrationKey);

	if (!redisMerchantData) {
		throw new AppError(httpStatus.NOT_FOUND, "Merchant Doesn't Exist");
	}

	const merchantPayload: IRegisterMerchantPayload =
		JSON.parse(redisMerchantData);

	const createdUser = await prisma.user.create({
		data: {
			name: merchantPayload.name,
			email: merchantPayload.email,
			password: merchantPayload.password,
			role: Role.MERCHANT,
			status: AccountStatus.ACTIVE,
			emailVerified: true,
			merchantProfile: {
				create: {
					name: merchantPayload.name,
					email: merchantPayload.email,
					phone: merchantPayload.merchantProfile.phone,
				},
			},
		},
		omit: { password: true },
		include: { merchantProfile: true },
	});

	await redisClient.del(merchantRegistrationKey);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/merchant-welcome-email.ejs",
	);

	const templateData = {
		name: createdUser.name,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: '"ParcelFlow" <noreply@parcelflow.com>',
		to: email,
		subject: "Welcome To ParcelFlow",
		html,
	});

	const { merchantProfile, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user,
		merchantProfile,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status === AccountStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (user.isDeleted) {
		throw new AppError(httpStatus.FORBIDDEN, "User is deleted");
	}

	if (user.password === null && user.googleId !== null) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User Already Has Account Registered With Google. Try To Login With Google.",
		);
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (userId: string) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	return isUserExists;
};

export const AuthService = {
	registerMerchant,
	verifyMerchantEmail,
	loginUser,
	getMe,
};
