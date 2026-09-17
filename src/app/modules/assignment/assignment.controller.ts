import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AssignmentService } from "./assignment.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const createAssignment = catchAsync(async (req: Request, res: Response) => {
	const assignment = await AssignmentService.createAssignment(
		req.body,
		req.user?.userId as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Assignment created successfully",
		data: assignment,
	});
});

export const AssignmentController = {
	createAssignment,
};
