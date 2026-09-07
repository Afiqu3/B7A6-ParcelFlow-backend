import z from "zod";

const applyAsRiderZodSchema = z.object({
	user: z.object({
		name: z.string().trim().min(2, "Name must be at least 2 characters long"),

		email: z.email("Invalid email address").trim().toLowerCase(),
	}),
	riderProfile: z.object({
		phone: z.string("Provide your phone number"),
		address: z
			.string()
			.trim()
			.min(5, "Address must be at least 5 characters long")
			.optional(),
		nid: z.string("Provide your phone number"),
		licenseNumber: z.string("Provide your phone number"),
		vehicleType: z.enum(
			["BIKE", "BICYCLE", "VAN"],
			"Vehicle type must be BIKE or BICYCLE or VAN",
		),
	}),
});

const riderEmailValidationSchema = z.object({
	email: z.email("Invalid email address").trim().toLowerCase(),
	otp: z.string().length(6),
});

export const RiderValidation = {
	applyAsRiderZodSchema,
	riderEmailValidationSchema,
};
