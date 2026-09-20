import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { TransactionService } from "./transaction.service";

const getMyTransactions = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const { data, meta } = await TransactionService.getMyTransactions(
		req.query,
		userId,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Transactions Retrieved Successfully",
		data,
		meta,
	});
});

const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await TransactionService.getAllTransactions(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Transactions Retrieved Successfully",
		data,
		meta,
	});
});

const getSingleTransaction = catchAsync(async (req: Request, res: Response) => {
	const paymentId = req.params.paymentId as string;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const result = await TransactionService.getSingleTransaction(
		paymentId,
		userId,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Retrieved Successfully",
		data: result,
	});
});

export const TransactionController = {
	getMyTransactions,
	getAllTransactions,
	getSingleTransaction,
};
