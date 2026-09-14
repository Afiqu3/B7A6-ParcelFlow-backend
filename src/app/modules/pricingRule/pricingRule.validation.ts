import { z } from "zod";
import { PARCEL_CATEGORIES, ZONE_TYPES } from "./pricingRule.constants";

const moneyField = (fieldName: string) =>
	z
		.number({ error: `${fieldName} must be a number` })
		.min(0, `${fieldName} cannot be negative`)
		.max(1_000_000, `${fieldName} looks unrealistically high`);

const optionalMoneyField = (fieldName: string) =>
	moneyField(fieldName).optional();

const positiveField = (fieldName: string) =>
	z
		.number({ error: `${fieldName} must be a number` })
		.positive(`${fieldName} must be greater than 0`);

const optionalPositiveField = (fieldName: string) =>
	positiveField(fieldName).optional();

const createPricingRuleZodSchema = z.object({
	name: z
		.string({ error: "Name must be a string" })
		.trim()
		.min(3, "Name must be at least 3 characters")
		.max(120, "Name must be at most 120 characters"),

	zoneType: z.enum(ZONE_TYPES, {
		error: `Zone type must be one of: ${ZONE_TYPES.join(", ")}`,
	}),

	parcelCategory: z.enum(PARCEL_CATEGORIES, {
		error: `Parcel category must be one of: ${PARCEL_CATEGORIES.join(", ")}`,
	}),

	baseWeightKg: optionalPositiveField("Base weight").refine(
		(v) => v === undefined || v <= 100,
		"Base weight cannot exceed 100 kg",
	),
	baseCharge: moneyField("Base charge"),
	perKgCharge: moneyField("Per-kg charge"),

	expressSurcharge: optionalMoneyField("Express surcharge"),
	sameDaySurcharge: optionalMoneyField("Same-day surcharge"),
	riderPickupCharge: optionalMoneyField("Rider pickup charge"),

	codFeePercent: z
		.number({ error: "COD fee percent must be a number" })
		.min(0, "COD fee percent cannot be negative")
		.max(100, "COD fee percent cannot exceed 100")
		.optional(),

	isActive: z.boolean().optional(),
});

export const updatePricingRuleZodSchema = createPricingRuleZodSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		error: "At least one field must be provided to update",
	});

// const createPricingRuleZodSchema = pricingRuleBase
//     .refine(
//         (data) =>
//             data.parcelCategory !== "DOCUMENT" ||
//             (data.codFeePercent ?? 0) === 0,
//         {
//             error: "Document parcels cannot have a COD fee",
//             path: ["codFeePercent"],
//         },
//     )
//     .refine(
//         (data) =>
//             data.parcelCategory !== "DOCUMENT" || (data.perKgCharge ?? 0) === 0,
//         {
//             error: "Document parcels should not have a per-kg charge",
//             path: ["perKgCharge"],
//         },
//     )
//     .refine(
//         (data) =>
//             data.parcelCategory !== "DOCUMENT" ||
//             (data.baseWeightKg ?? 1) === 1,
//         {
//             error: "Document parcels should not set a custom base weight",
//             path: ["baseWeightKg"],
//         },
//     );

export const PricingRuleValidations = {
	createPricingRuleZodSchema,
	updatePricingRuleZodSchema,
};
