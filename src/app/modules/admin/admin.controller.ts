import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AdminService } from "./admin.service";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	await AdminService.createAdmin(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Admin created successfully",
		data: null,
	});
});

const createSuperAdmin = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	await AdminService.createAdmin(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Admin created successfully",
		data: null,
	});
});

export const AdminController = {
	createAdmin,
	createSuperAdmin,
};
