import type { AssignmentLeg } from "../../../generated/prisma/enums";

export interface ICreateAssignmentPayload {
	parcelId: string;
	riderId: string;
	leg: AssignmentLeg; // PICKUP | DELIVERY
	// status (ASSIGNED), attemptNumber, and assignedById are set server-side —
	// never accepted from the client.
}
