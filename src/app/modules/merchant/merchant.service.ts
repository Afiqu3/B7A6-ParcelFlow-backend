import httpStatus from "http-status";
import { AccountStatus, Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { IMerchantUpdatePayload } from "./merchant.interface";
import { jwtUtils } from "../../utils/jwt";
import config from "../../config";
import type { SignOptions } from "jsonwebtoken";
import type { IQuery } from "../../interfaces";
import type { MerchantProfileWhereInput } from "../../../generated/prisma/models";

const showProfile = async (userId: string) => {
	const isMerchantExists = await prisma.user.findUnique({
		where: {
			id: userId,
			role: Role.MERCHANT,
		},
		omit: {
			password: true,
		},
		include: {
			merchantProfile: true,
		},
	});
	if (!isMerchantExists) {
		throw new AppError(httpStatus.NOT_FOUND, "merchant Not Found");
	}

	if (!isMerchantExists.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "merchant Email Not Verified");
	}

	if (isMerchantExists.isDeleted) {
		throw new AppError(httpStatus.BAD_REQUEST, "merchant Account Deleted");
	}

	return isMerchantExists;
};

const updateMerchantProfile = async (
	payload: IMerchantUpdatePayload,
	merchantId: string,
) => {
	const existingMerchant = await prisma.user.findUnique({
		where: { id: merchantId },
		include: { merchantProfile: true },
	});

	if (!existingMerchant) {
		throw new AppError(httpStatus.NOT_FOUND, "Merchant Not Found");
	}

	if (existingMerchant.isDeleted) {
		throw new AppError(httpStatus.GONE, "Merchant Account Has Been Deleted");
	}

	if (!existingMerchant.emailVerified) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Merchant Has Not Verified Their Email Yet. Profile Cannot Be Updated.",
		);
	}

	if (existingMerchant.status === AccountStatus.BLOCKED) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Merchant Account Is Blocked. Profile Cannot Be Updated.",
		);
	}

	const updatedMerchant = await prisma.user.update({
		where: { id: merchantId },
		data: {
			name: payload.name ?? existingMerchant.name,
			merchantProfile: {
				update: {
					name: payload.name ?? existingMerchant.name,
					phone: payload.phone ?? existingMerchant.merchantProfile?.phone,
					businessName:
						payload.businessName ??
						existingMerchant.merchantProfile?.businessName,
				},
			},
		},
		include: {
			merchantProfile: true,
		},
		omit: {
			password: true,
		},
	});

	const jwtPayload = {
		userId: updatedMerchant.id,
		name: updatedMerchant.name,
		email: updatedMerchant.email,
		role: updatedMerchant.role,
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
		updatedMerchant,
		accessToken,
		refreshToken,
	};
};

const getAllMerchant = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: MerchantProfileWhereInput[] = [];

	//Searching
	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	if (query.email) {
		andConditions.push({
			email: { contains: query.email, mode: "insensitive" },
		});
	}

	if (query.status) {
		andConditions.push({
			user: {
				status: query.status,
			},
		});
	}

	andConditions.push({ user: { role: Role.MERCHANT }, isDeleted: false });

	const allMerchants = await prisma.merchantProfile.findMany({
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

	const totalMerchantCount = await prisma.merchantProfile.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: allMerchants,
		meta: {
			page: page,
			limit: limit,
			total: totalMerchantCount,
			totalPages: Math.ceil(totalMerchantCount / limit),
		},
	};
};

const updateMerchantStatus = async (userId: string) => {
	const existingUser = await prisma.user.findFirst({
		where: {
			id: userId,
			role: { in: ["MERCHANT"] },
		},
	});

	if (!existingUser) {
		throw new AppError(httpStatus.NOT_FOUND, "Merchant not found");
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

	const updatedMerchant = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		omit: {
			password: true,
		},
		include: {
			merchantProfile: true,
		},
	});

	return updatedMerchant;
};

export const MerchantService = {
	showProfile,
	updateMerchantProfile,
	getAllMerchant,
	updateMerchantStatus,
};
