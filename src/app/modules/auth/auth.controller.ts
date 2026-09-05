import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AuthService } from "./auth.service";

const registerMerchant = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	await AuthService.registerMerchant(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Verification OTP Sent",
		data: null,
	});
});

const verifyMerchantEmail = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await AuthService.verifyMerchantEmail(payload);

	const { accessToken, refreshToken, user, merchantProfile } = result;

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
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Email Verified Successfully",
		data: {
			accessToken,
			refreshToken,
			user,
			merchantProfile,
		},
	});
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await AuthService.loginUser(payload);
	const { accessToken, refreshToken } = result;

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
		message: "User logged in successfully",
		data: {
			accessToken,
			refreshToken,
		},
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"User information is missing in the request",
		);
	}

	const result = await AuthService.getMe(userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile fetched successfully",
		data: result,
	});
});

export const AuthController = {
	registerMerchant,
	verifyMerchantEmail,
	loginUser,
	getMe,
};
