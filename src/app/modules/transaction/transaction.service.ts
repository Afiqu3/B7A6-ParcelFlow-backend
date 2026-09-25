import httpStatus from "http-status";
import type { TransactionWhereInput } from "../../../generated/prisma/models";
import type { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { Role } from "../../../generated/prisma/enums";

const getMyTransactions = async (query: IQuery, userId: string) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const merchant = await prisma.merchantProfile.findUnique({
		where: { userId: userId },
	});

	if (!merchant) {
		throw new AppError(httpStatus.NOT_FOUND, "Merchant Profile Not Found");
	}

	const andConditions: TransactionWhereInput[] = [
		{
			parcel: { merchantId: merchant.id },
		},
	];

	const transactions = await prisma.transaction.findMany({
		where: { AND: andConditions },
		take: limit,
		skip,
		orderBy: { [sortBy]: sortOrder },
		include: {
			parcel: {
				include: {
					merchant: {
						select: { id: true, name: true },
					},
				},
			},
		},
	});

	const total = await prisma.transaction.count({
		where: { AND: andConditions },
	});

	return {
		data: transactions,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getAllTransactions = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: TransactionWhereInput[] = [];

	if (query.merchantEmail) {
		andConditions.push({
			parcel: {
				merchant: {
					email: query.merchantEmail,
				},
			},
		});
	}

	const transactions = await prisma.transaction.findMany({
		where: { AND: andConditions },
		take: limit,
		skip,
		orderBy: { [sortBy]: sortOrder },
		include: {
			parcel: {
				include: {
					merchant: { select: { id: true, name: true } },
				},
			},
		},
	});

	const total = await prisma.transaction.count({
		where: { AND: andConditions },
	});

	return {
		data: transactions,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getSingleTransaction = async (paymentId: string, userId: string) => {
	const transaction = await prisma.transaction.findUnique({
		where: { id: paymentId },
		include: {
			parcel: {
				include: {
					merchant: {
						select: {
							id: true,
							name: true,
							email: true,
							user: true,
						},
					},
				},
			},
		},
	});

	const existingUser = await prisma.user.findUnique({
		where: {
			id: userId
		},
		omit: {
			password: true
		}
	});

	if(!existingUser) {
		throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
	}

	if (!transaction) {
		throw new AppError(httpStatus.NOT_FOUND, "transaction Not Found");
	}

	if (existingUser.role === Role.MERCHANT) {
		if (transaction.parcel.merchant.user.id !== userId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You Are Not Allowed To View This Payment",
			);
		}
	}

	return transaction;
};

export const TransactionService = {
	getMyTransactions,
	getAllTransactions,
	getSingleTransaction,
};
