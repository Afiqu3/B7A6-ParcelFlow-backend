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

const getAllRider = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await RiderService.getAllRider(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Riders Retrieved Successfully",
		data: data,
		meta: meta,
	});
});

const getRiderProfile = catchAsync(async (req: Request, res: Response) => {
	const riderId = req.params.riderId;

	const result = await RiderService.getRiderProfile(riderId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Rider Profile Retrieved Successfully",
		data: result,
	});
});

const approveRider = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const reviewerId = req.user?.userId as string;

	const result = await RiderService.approveRider(payload, reviewerId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Rider Application Reviewed Successfully",
		data: result,
	});
});

const updateRiderProfile = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const riderId = req.user?.userId as string;

	const result = await RiderService.updateRiderProfile(payload, riderId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Rider Profile Updated Successfully",
		data: result,
	});
});

export const RiderController = {
	applyAsRider,
	verifyRiderEmail,
	getAllRider,
	getRiderProfile,
	approveRider,
	updateRiderProfile,
};
