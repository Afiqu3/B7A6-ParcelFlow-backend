import { z } from "zod";
import { AssignmentLeg } from "../../../generated/prisma/enums";

const createAssignmentZodValidationSchema = z.object({
	parcelId: z
		.string({ error: "Parcel id is required" })
		.trim()
		.min(1, "Parcel id is required"),
	riderId: z
		.string({ error: "Rider id is required" })
		.trim()
		.min(1, "Rider id is required"),
	leg: z.enum(AssignmentLeg, {
		error: "Leg must be PICKUP or DELIVERY",
	}),
});

const failAssignmentZodValidationSchema = z.object({
	reason: z
		.string({ error: "A failure reason is required" })
		.trim()
		.min(1, "A failure reason is required")
		.max(500, "Reason is too long"),
});

const rejectAssignmentZodValidationSchema = z.object({
	reason: z.string().trim().max(500, "Reason is too long").optional(),
});

const cancelAssignmentZodValidationSchema = z.object({
	reason: z.string().trim().max(500, "Reason is too long").optional(),
});

export const AssignmentValidation = {
	createAssignmentZodValidationSchema,
	failAssignmentZodValidationSchema,
	rejectAssignmentZodValidationSchema,
	cancelAssignmentZodValidationSchema,
};
