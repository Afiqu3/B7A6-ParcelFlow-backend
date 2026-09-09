import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { MerchantService } from "./merchant.service";

const showProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	const result = await MerchantService.showProfile(userId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Your Profile Retrieved Successfully",
		data: result,
	});
});

const updateMerchantProfile = catchAsync(
	async (req: Request, res: Response) => {
		const { updatedMerchant, accessToken, refreshToken } =
			await MerchantService.updateMerchantProfile(
				req.body,
				req.user?.userId as string,
			);

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
			data: { accessToken, refreshToken, updatedMerchant },
		});
	},
);

export const MerchantController = {
	showProfile,
	updateMerchantProfile,
};
