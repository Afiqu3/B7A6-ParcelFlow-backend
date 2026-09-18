import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AssignmentService } from "./assignment.service";

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

const acceptAssignment = catchAsync(async (req: Request, res: Response) => {
	const assignmentId = req.params.assignmentId as string;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const assignment = await AssignmentService.acceptAssignment(
		assignmentId,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment accepted successfully",
		data: assignment,
	});
});

const startAssignment = catchAsync(async (req: Request, res: Response) => {
	const assignmentId = req.params.assignmentId as string;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const assignment = await AssignmentService.startAssignment(
		assignmentId,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment started successfully",
		data: assignment,
	});
});

const completeAssignment = catchAsync(async (req: Request, res: Response) => {
	const assignmentId = req.params.assignmentId as string;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const assignment = await AssignmentService.completeAssignment(
		assignmentId,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment completed successfully",
		data: assignment,
	});
});

const failAssignment = catchAsync(async (req: Request, res: Response) => {
	const assignmentId = req.params.assignmentId as string;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const assignment = await AssignmentService.failAssignment(
		assignmentId,
		userId,
		req.body.reason as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment marked as failed",
		data: assignment,
	});
});

const rejectAssignment = catchAsync(async (req: Request, res: Response) => {
	const assignmentId = req.params.assignmentId as string;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const assignment = await AssignmentService.rejectAssignment(
		assignmentId,
		userId,
		req.body.reason as string | undefined,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment rejected successfully",
		data: assignment,
	});
});

const getMyAssignments = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const { data, meta } = await AssignmentService.getMyAssignments(
		req.query,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignments retrieved successfully",
		data,
		meta,
	});
});

const listAssignments = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await AssignmentService.listAssignments(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignments retrieved successfully",
		data,
		meta,
	});
});

const cancelAssignment = catchAsync(async (req: Request, res: Response) => {
	const assignmentId = req.params.assignmentId as string;

	const assignment = await AssignmentService.cancelAssignment(
		assignmentId,
		req.body.reason as string | undefined,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment cancelled successfully",
		data: assignment,
	});
});

export const AssignmentController = {
	createAssignment,
	acceptAssignment,
	startAssignment,
	completeAssignment,
	failAssignment,
	rejectAssignment,
	getMyAssignments,
	listAssignments,
	cancelAssignment,
};
