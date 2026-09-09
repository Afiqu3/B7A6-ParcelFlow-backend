import z from "zod";

const updateMerchantProfileValidationSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Name must be at least 2 characters long")
		.optional(),
	phone: z.string("Provide your phone number").optional(),
	businessName: z.string().trim().optional(),
});

export const MerchantValidation = {
	updateMerchantProfileValidationSchema,
};
