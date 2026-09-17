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

export const AssignmentValidation = {
	createAssignmentZodValidationSchema,
};
