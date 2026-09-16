import config from "../config";
import { getBkashIdToken } from "../lib/bkash";
import { AppError } from "./AppError";
import httpStatus from "http-status";

export const refundBkashPayment = async (input: {
	paymentID: string;
	trxID: string;
	amount: number;
	sku: string;
	reason: string;
}) => {
	const bkashIdToken = await getBkashIdToken();

	if (!bkashIdToken) {
		throw new AppError(httpStatus.BAD_GATEWAY, "No Bkash Access Token Found!");
	}

	const refundResponse = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/payment/refund`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: bkashIdToken,
				"X-App-Key": config.bkash_app_key,
			},
			body: JSON.stringify({
				paymentID: input.paymentID,
				trxID: input.trxID,
				amount: input.amount.toFixed(2),
				sku: input.sku,
				reason: input.reason,
			}),
		},
	);

	const refundResult = await refundResponse.json();

	// bKash returns statusCode "0000" (transactionStatus "Completed") on a
	// successful refund.
	if (!refundResponse.ok || refundResult.statusCode !== "0000") {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			refundResult?.statusMessage || "bKash refund failed",
		);
	}

	return refundResult;
};