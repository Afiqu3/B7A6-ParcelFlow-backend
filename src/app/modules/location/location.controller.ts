import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IQuery } from "../../interfaces";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { LocationService } from "./location.service";

const getDivisions = catchAsync(async (req: Request, res: Response) => {
	const divisions = await LocationService.getDivisions();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Active divisions retrieved successfully",
		data: divisions,
	});
});

const getDistricts = catchAsync(async (req: Request, res: Response) => {
	const divisionId = req.query.divisionId as string;
	const { data, meta } = await LocationService.getDistricts(
		divisionId,
		req.query as IQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Active districts retrieved successfully",
		data,
		meta,
	});
});

const getCities = catchAsync(async (req: Request, res: Response) => {
	const districtId = req.query.districtId as string;
	const { data, meta } = await LocationService.getCities(
		districtId,
		req.query as IQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Active cities retrieved successfully",
		data,
		meta,
	});
});

export const LocationController = {
	getDivisions,
	getDistricts,
	getCities,
};