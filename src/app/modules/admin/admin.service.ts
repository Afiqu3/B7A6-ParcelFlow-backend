import bcrypt from "bcryptjs";
import ejs from "ejs";
import httpStatus from "http-status";
import type { SignOptions } from "jsonwebtoken";
import path from "path";
import { AccountStatus, Role } from "../../../generated/prisma/enums";
import type { UserWhereInput } from "../../../generated/prisma/models";
import config from "../../config";
import type { IQuery } from "../../interfaces";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";
import type {
	IAdminCreatePayload,
	IAdminUpdatePayload,
} from "./admin.interface";

const createAdmin = async (payload: IAdminCreatePayload) => {
	const { name, email, password, personalEmail } = payload;

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

	const admin = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.ADMIN,
			emailVerified: true,
			mustChangePassword: true,
		},
		omit: {
			password: true,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/admin-welcome-email.ejs",
	);

	const templateData = {
		name: admin.name,
		email: admin.email,
		role: admin.role,
		password,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: '"ParcelFlow" <noreply@parcelflow.com>',
		to: personalEmail,
		subject: "Welcome To ParcelFlow",
		html,
	});
};

const createSuperAdmin = async (payload: IAdminCreatePayload) => {
	const { name, email, password, personalEmail } = payload;

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

	const admin = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.SUPER_ADMIN,
			emailVerified: true,
			mustChangePassword: true,
		},
		omit: {
			password: true,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/admin-welcome-email.ejs",
	);

	const templateData = {
		name: admin.name,
		email: admin.email,
		role: admin.role,
		password,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: '"ParcelFlow" <noreply@parcelflow.com>',
		to: personalEmail,
		subject: "Welcome To ParcelFlow",
		html,
	});
};

const getAllAdmin = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: UserWhereInput[] = [];

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	//filtering
	if (query.role) {
		andConditions.push({
			role: {
				equals: query.role,
			},
		});
	}

	andConditions.push({ role: Role.ADMIN, isDeleted: false });

	const allAdmins = await prisma.user.findMany({
		where: {
			AND: andConditions,
		},

		take: limit,
		skip: skip,

		orderBy: {
			// sortBy : sortOrder
			[sortBy]: sortOrder,
		},
		omit: {
			password: true,
		},
	});

	const totalAdminCount = await prisma.user.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: allAdmins,
		meta: {
			page: page,
			limit: limit,
			total: totalAdminCount,
			totalPages: Math.ceil(totalAdminCount / limit),
		},
	};
};

const getAllSuperAdmin = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: UserWhereInput[] = [];

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	//filtering
	if (query.role) {
		andConditions.push({
			role: {
				equals: query.role,
			},
		});
	}

	andConditions.push({ role: Role.SUPER_ADMIN, isDeleted: false });

	const allSuperAdmins = await prisma.user.findMany({
		where: {
			AND: andConditions,
		},

		take: limit,
		skip: skip,

		orderBy: {
			// sortBy : sortOrder
			[sortBy]: sortOrder,
		},
		omit: {
			password: true,
		},
	});

	const totalSuperAdminCount = await prisma.user.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: allSuperAdmins,
		meta: {
			page: page,
			limit: limit,
			total: totalSuperAdminCount,
			totalPages: Math.ceil(totalSuperAdminCount / limit),
		},
	};
};

const updateAdmin = async (payload: IAdminUpdatePayload, userId: string) => {
	const { name } = payload;

	const existingUser = await prisma.user.findFirst({
		where: {
			id: userId,
			role: { in: ["ADMIN", "SUPER_ADMIN"] },
		},
	});

	if (!existingUser) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
	}

	const updatedAdmin = await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			...(name !== undefined && name !== null && { name }),
		},
	});

	const jwtPayload = {
		userId: updatedAdmin.id,
		name: updatedAdmin.name,
		email: updatedAdmin.email,
		role: updatedAdmin.role,
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
		updatedAdmin,
		accessToken,
		refreshToken,
	};
};

const updateAdminStatus = async (userId: string) => {
	const existingUser = await prisma.user.findFirst({
		where: {
			id: userId,
			role: { in: ["ADMIN", "SUPER_ADMIN"] },
		},
	});

	if (!existingUser) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
	}

	if (existingUser.status === "ACTIVE") {
		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				status: AccountStatus.BLOCKED,
			},
		});
	} else {
		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				status: AccountStatus.ACTIVE,
			},
		});
	}

	const updatedAdmin = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		omit: {
			password: true,
		},
	});

	return updatedAdmin;
};

export const AdminService = {
	createAdmin,
	createSuperAdmin,
	getAllAdmin,
	getAllSuperAdmin,
	updateAdmin,
	updateAdminStatus,
};
