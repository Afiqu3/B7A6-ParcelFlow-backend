import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreatePricingRulePayload,
	IUpdatePricingRulePayload,
} from "./pricingRule.interface";

const createPricingRule = async (payload: ICreatePricingRulePayload) => {
	const isPricingRuleExists = await prisma.pricingRule.findFirst({
		where: {
			name: payload.name,
		},
	});
	if (isPricingRuleExists) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Pricing rule with this name already exists",
		);
	}
	if (
		payload.parcelCategory === "DOCUMENT" &&
		(payload.codFeePercent ?? 0) > 0
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"COD fee percent cannot be greater than 0 for DOCUMENT parcel category",
		);
	}

	if (payload.parcelCategory === "DOCUMENT" && (payload.perKgCharge ?? 0) > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Per kg charge cannot be greater than 0 for DOCUMENT parcel category",
		);
	}

	if (
		payload.parcelCategory === "DOCUMENT" &&
		(payload.baseWeightKg ?? 1) !== 1
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Base weight cannot be set for DOCUMENT parcel category",
		);
	}

	const newPricingRule = await prisma.pricingRule.create({
		data: {
			...payload,
		},
	});
	return newPricingRule;
};

const updatePricingRule = async (
	payload: IUpdatePricingRulePayload,
	ruleId: string,
) => {
	const existingPricingRule = await prisma.pricingRule.findUnique({
		where: {
			id: ruleId,
		},
	});
	if (!existingPricingRule) {
		throw new AppError(httpStatus.NOT_FOUND, "Pricing rule not found");
	}

	if (payload.name && payload.name !== existingPricingRule.name) {
		const isPricingRuleExists = await prisma.pricingRule.findFirst({
			where: {
				name: payload.name,
				NOT: {
					id: ruleId,
				},
			},
		});
		if (isPricingRuleExists) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Pricing rule with this name already exists",
			);
		}
	}

	if (payload.parcelCategory && payload.parcelCategory === "DOCUMENT") {
		if ((payload.codFeePercent ?? 0) > 0) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"COD fee percent cannot be greater than 0 for DOCUMENT parcel category",
			);
		}
		if ((payload.perKgCharge ?? 0) > 0) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Per kg charge cannot be greater than 0 for DOCUMENT parcel category",
			);
		}
		if ((payload.baseWeightKg ?? 1) !== 1) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Base weight cannot be set for DOCUMENT parcel category",
			);
		}
	}

	const updatedPricingRule = await prisma.pricingRule.update({
		where: {
			id: ruleId,
		},
		data: {
			...payload,
		},
	});
	return updatedPricingRule;
};

const getAllPricingRules = async () => {
	const pricingRules = await prisma.pricingRule.findMany();
	return pricingRules;
};

export const PricingRuleService = {
	createPricingRule,
	updatePricingRule,
	getAllPricingRules,
};
