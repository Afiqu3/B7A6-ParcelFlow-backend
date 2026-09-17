import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ParcelService } from "./parcel.service";

const createParcel = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const result = await ParcelService.createParcel(payload, userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Parcel created Successfully",
		data: result,
	});
});

const initiateParcelPayment = catchAsync(
	async (req: Request, res: Response) => {
		const parcelId = req.params.parcelId as string;
		const userId = req.user?.userId;

		if (!userId) {
			throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
		}

		const result = await ParcelService.initiateParcelPayment(parcelId, userId);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Parcel Payment Initiated Successfully",
			data: result,
		});
	},
);

const paymentCallback = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;

	const { redirectUrl } = await ParcelService.paymentCallback(query);

	res.redirect(redirectUrl);
});

const cancelParcel = catchAsync(async (req: Request, res: Response) => {
	const parcelId = req.params.parcelId as string;
	const userId = req.user?.userId;
	const cancelReason = req.body.cancelReason as string;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const result = await ParcelService.cancelParcel(
		parcelId,
		userId,
		cancelReason,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Parcel cancelled Successfully",
		data: result,
	});
});

const getMyParcels = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const { data, meta } = await ParcelService.getMyParcels(req.query, userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Parcels Retrieved Successfully",
		data,
		meta,
	});
});

const listParcels = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await ParcelService.listParcels(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Parcels Retrieved Successfully",
		data,
		meta,
	});
});

const getSingleParcelAsAdmin = catchAsync(
	async (req: Request, res: Response) => {
		const parcelId = req.params.parcelId as string;

		const result = await ParcelService.getSingleParcelAsAdmin(parcelId);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Parcel Retrieved Successfully",
			data: result,
		});
	},
);

const getSingleParcelAsMerchant = catchAsync(
	async (req: Request, res: Response) => {
		const parcelId = req.params.parcelId as string;
		const userId = req.user?.userId;

		if (!userId) {
			throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
		}

		const result = await ParcelService.getSingleParcelAsMerchant(
			parcelId,
			userId,
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Parcel Retrieved Successfully",
			data: result,
		});
	},
);

const trackParcel = catchAsync(async (req: Request, res: Response) => {
	const trackingId = req.params.trackingId as string;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const result = await ParcelService.trackParcel(trackingId, userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Parcel Tracking Retrieved Successfully",
		data: result,
	});
});

const deleteParcel = catchAsync(async (req: Request, res: Response) => {
	const parcelId = req.params.parcelId as string;
	const userId = req.user?.userId;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	await ParcelService.deleteParcel(parcelId, userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Parcel Deleted Successfully",
		data: null,
	});
});

const downloadParcelInvoice = catchAsync(
	async (req: Request, res: Response) => {
		const parcelId = req.params.parcelId as string;
		const userId = req.user?.userId;

		if (!userId) {
			throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
		}

		const pdfBuffer = await ParcelService.downloadParcelInvoice(
			parcelId,
			userId,
		);

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="invoice-${parcelId}.pdf"`,
		);
		res.setHeader("Content-Length", pdfBuffer.length);
		res.send(pdfBuffer);
	},
);

const parcelStatusUpdateByAdmin = catchAsync(
	async (req: Request, res: Response) => {
		const parcelId = req.params.parcelId as string;
		const payload = req.body;

		const result = await ParcelService.parcelStatusUpdateByAdmin(
			payload,
			parcelId,
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Parcel Status Updated Successfully",
			data: result,
		});
	},
);

const cancelParcelByAdmin = catchAsync(async (req: Request, res: Response) => {
	const parcelId = req.params.parcelId as string;
	const userId = req.user?.userId;
	const cancelReason = req.body.cancelReason as string | undefined;

	if (!userId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "No User found!");
	}

	const result = await ParcelService.cancelParcelByAdmin(
		parcelId,
		userId,
		cancelReason,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Parcel cancelled Successfully",
		data: result,
	});
});

export const ParcelController = {
	createParcel,
	initiateParcelPayment,
	paymentCallback,
	cancelParcel,
	cancelParcelByAdmin,
	getMyParcels,
	listParcels,
	getSingleParcelAsAdmin,
	getSingleParcelAsMerchant,
	trackParcel,
	deleteParcel,
	downloadParcelInvoice,
	parcelStatusUpdateByAdmin,
};
