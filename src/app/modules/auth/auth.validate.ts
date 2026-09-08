import z from "zod";

const MerchantRegistrationZodSchema = z.object({
	name: z
		.string("Provide your name")
		.min(3, "Name must at least 3 characters long!!!")
		.max(50),
	email: z.email("Invalid email address").trim().toLowerCase(),
	password: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain at least 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain at least 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain at least 1 Number")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least 1 Special Character",
		),
	merchantProfile: z
		.object({
			businessName: z.string().optional(),
			phone: z.string("Provide your phone number"),
		})
		.optional(),
});

const MerchantEmailVerifyZodSchema = z.object({
	email: z.email("Invalid email address").trim().toLowerCase(),
	otp: z.string().length(6),
});

const LoginZodSchema = z.object({
	email: z.email("Invalid email address").trim().toLowerCase(),
	password: z.string(),
});

const ForgotPasswordZodSchema = z.object({
	email: z.email("Invalid email address").trim().toLowerCase(),
});

const ResetPasswordZodSchema = z.object({
	email: z.email("Invalid email address").trim().toLowerCase(),
	newPassword: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain at least 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain at least 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain at least 1 Number")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least 1 Special Character",
		),
	otp: z.string().length(6),
});

const ChangePasswordZodSchema = z.object({
	currentPassword: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain at least 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain at least 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain at least 1 Number")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least 1 Special Character",
		),
	newPassword: z
		.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain at least 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain at least 1 Uppercase Letter")

		.regex(/[0-9]/, "Password must contain at least 1 Number")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least 1 Special Character",
		),
});

export const UserValidation = {
	MerchantRegistrationZodSchema,
	MerchantEmailVerifyZodSchema,
	LoginZodSchema,
	ForgotPasswordZodSchema,
	ResetPasswordZodSchema,
	ChangePasswordZodSchema,
};
