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

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
	const { updatedAdmin, accessToken, refreshToken } =
		await AdminService.updateAdmin(req.body, req.user?.userId as string);

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile updated Successfully",
		data: { accessToken, refreshToken, updatedAdmin },
	});
});

const updateAdminStatus = catchAsync(async (req: Request, res: Response) => {
	const data = await AdminService.updateAdminStatus(
		req.params.userId as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin status updated Successfully",
		data: data,
	});
});

export const AdminController = {
	createAdmin,
	createSuperAdmin,
	getAllAdmin,
	getAllSuperAdmin,
	updateAdmin,
	updateAdminStatus,
};
