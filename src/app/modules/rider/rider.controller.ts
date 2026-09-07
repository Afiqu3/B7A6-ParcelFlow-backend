import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { RiderService } from "./rider.service";
import { RiderValidation } from "./rider.validation";

const applyAsRider = catchAsync(async (req: Request, res: Response) => {
	const files = req.files as { [fieldName: string]: Express.Multer.File[] };
	const vehiclePaper = files.vehiclePaper[0];

	const zodValidationResult = RiderValidation.applyAsRiderZodSchema.safeParse(
		JSON.parse(req.body.data),
	);

	if (!zodValidationResult.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			zodValidationResult.error.issues[0].message,
		);
	}

	const payload = zodValidationResult.data;

	const result = await RiderService.applyAsRider(payload, vehiclePaper);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Applied As Doctor Successfully",
		data: result,
	});
});

const verifyRiderEmail = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await RiderService.verifyRiderEmail(payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Rider Email Verified Successfully",
		data: result,
	});
});

export const RiderController = {
	applyAsRider,
	verifyRiderEmail,
};
