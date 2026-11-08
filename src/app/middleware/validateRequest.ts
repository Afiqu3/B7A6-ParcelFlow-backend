import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type z from "zod";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

type RequestProperty = "body" | "query" | "params";

export const validateRequest = (
	zodSchema: z.ZodObject,
	requestProperty: RequestProperty = "body",
) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		const payload = req[requestProperty] ?? {};

		const result = zodSchema.safeParse(payload);
		if (!result.success) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				result.error.issues[0].message,
			);
		}

		if (requestProperty === "body") {
			req.body = result.data;
		}

		next();
	});
};
