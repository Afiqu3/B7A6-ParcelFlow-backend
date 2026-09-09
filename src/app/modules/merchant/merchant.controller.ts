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

export const MerchantController = {
	showProfile,
};
