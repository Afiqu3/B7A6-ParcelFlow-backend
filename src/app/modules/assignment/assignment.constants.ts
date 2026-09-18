import {
	type AssignmentLeg,
	AssignmentStatus,
	ParcelStatus,
} from "../../../generated/prisma/enums";

// An assignment in one of these states is still "live" — a parcel may not
// receive a second assignment for the same leg while one of these exists.
// This is what enforces "at a time, the admin can assign only one rider".
export const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
	AssignmentStatus.ASSIGNED,
	AssignmentStatus.ACCEPTED,
	AssignmentStatus.IN_PROGRESS,
];

// Which parcel statuses a given leg may be assigned against.
// DELIVERY is allowed from AT_HUB (first attempt) or DELIVERY_FAILED (re-attempt).
export const ASSIGNABLE_PARCEL_STATUS: Record<AssignmentLeg, ParcelStatus[]> = {
	PICKUP: [ParcelStatus.CREATED],
	DELIVERY: [ParcelStatus.AT_HUB, ParcelStatus.DELIVERY_FAILED],
};

// Legal transitions for an assignment's own status. Rider drives
// ACCEPTED / IN_PROGRESS / COMPLETED / FAILED / REJECTED; admin drives CANCELLED.
export const ASSIGNMENT_STATUS_TRANSITIONS: Record<
	AssignmentStatus,
	AssignmentStatus[]
> = {
	ASSIGNED: [
		AssignmentStatus.ACCEPTED,
		AssignmentStatus.REJECTED,
		AssignmentStatus.CANCELLED,
	],
	ACCEPTED: [
		AssignmentStatus.IN_PROGRESS,
		AssignmentStatus.FAILED,
		AssignmentStatus.CANCELLED,
	],
	IN_PROGRESS: [
		AssignmentStatus.COMPLETED,
		AssignmentStatus.FAILED,
		AssignmentStatus.CANCELLED,
	],
	COMPLETED: [],
	FAILED: [],
	CANCELLED: [],
	REJECTED: [],
};
