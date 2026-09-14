import type { ParcelCategory, ZoneType } from "../../../generated/prisma/enums";

export interface ICreatePricingRulePayload {
	name: string;

	zoneType: ZoneType;
	parcelCategory: ParcelCategory;

	baseWeightKg?: number;
	baseCharge: number;
	perKgCharge: number;

	expressSurcharge?: number;
	sameDaySurcharge?: number;

	riderPickupCharge?: number;

	codFeePercent?: number;

	isActive?: boolean;
}

export type IUpdatePricingRulePayload = Partial<ICreatePricingRulePayload>;
