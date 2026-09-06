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

const getAllAdmin = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await AdminService.getAllAdmin(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admins Retrieved Successfully",
		data: data,
		meta: meta,
	});
});

const getAllSuperAdmin = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await AdminService.getAllSuperAdmin(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Super admins Retrieved Successfully",
		data: data,
		meta: meta,
	});
});

export const AdminController = {
	createAdmin,
	createSuperAdmin,
	getAllAdmin,
	getAllSuperAdmin,
};
