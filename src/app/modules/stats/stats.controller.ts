import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { StatsService } from "./stats.service";

const getAdminStats = catchAsync(async (_req: Request, res: Response) => {
	const stats = await StatsService.getAdminStats();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin dashboard stats retrieved successfully",
		data: stats,
	});
});

const getMerchantStats = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const stats = await StatsService.getMerchantStats(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Merchant dashboard stats retrieved successfully",
		data: stats,
	});
});

const getRiderStats = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const stats = await StatsService.getRiderStats(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Rider dashboard stats retrieved successfully",
		data: stats,
	});
});

export const StatsController = {
	getAdminStats,
	getMerchantStats,
	getRiderStats,
};
