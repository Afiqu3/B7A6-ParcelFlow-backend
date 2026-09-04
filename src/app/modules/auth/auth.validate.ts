import z from "zod";

const MerchantRegistrationZodSchema = z.object({
    name: z
        .string("Provide your name")
        .min(3, "Name must at least 3 characters long!!!")
        .max(50),
    email: z.email("Provide a valid email!!"),
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
    email: z.email("Provide a valid email!!"),
    otp: z.string().length(6),
});

export const UserValidation = {
    MerchantRegistrationZodSchema,
    MerchantEmailVerifyZodSchema,
};
