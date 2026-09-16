import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";
import { ParcelService } from "./parcel.service";
import httpStatus from "http-status";
import { sendResponse } from "../../utils/sendResponse";

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
    message: "Appointments Retrieved Successfully",
    data,
    meta,
  });
});

export const ParcelController = {
  createParcel,
  initiateParcelPayment,
  paymentCallback,
  cancelParcel,
  getMyParcels,
};
