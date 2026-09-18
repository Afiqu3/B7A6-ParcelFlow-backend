import httpStatus from "http-status";
import {
	AssignmentStatus,
	ParcelStatus,
	PaymentType,
} from "../../../generated/prisma/enums";
import type { AssignmentWhereInput } from "../../../generated/prisma/models";
import type { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
	ACTIVE_ASSIGNMENT_STATUSES,
	ASSIGNABLE_PARCEL_STATUS,
	ASSIGNMENT_STATUS_TRANSITIONS,
} from "./assignment.constants";
import type { ICreateAssignmentPayload } from "./assignment.interface";

// ── Helpers ───────────────────────────────────────────────

// Resolve the RiderProfile that belongs to the authenticated user (the JWT
// carries the User id, but assignments reference RiderProfile.id).
const resolveRiderProfile = async (userId: string) => {
	const rider = await prisma.riderProfile.findUnique({
		where: { userId },
	});

	if (!rider) {
		throw new AppError(httpStatus.NOT_FOUND, "Rider profile not found");
	}

	if (rider.isDeleted) {
		throw new AppError(httpStatus.FORBIDDEN, "Rider account has been deleted");
	}

	return rider;
};

// Load an assignment and assert it belongs to the given rider.
const getOwnedAssignment = async (assignmentId: string, riderId: string) => {
	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: { parcel: true },
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	if (assignment.riderId !== riderId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You do not have access to this assignment",
		);
	}

	return assignment;
};

// Enforce the assignment state machine.
const assertTransition = (from: AssignmentStatus, to: AssignmentStatus) => {
	if (!ASSIGNMENT_STATUS_TRANSITIONS[from].includes(to)) {
		throw new AppError(
			httpStatus.CONFLICT,
			`Cannot change assignment status from ${from} to ${to}`,
		);
	}
};

// ── Admin: create an assignment ───────────────────────────

const createAssignment = async (
	payload: ICreateAssignmentPayload,
	assignedBy: string,
) => {
	const { parcelId, riderId, leg } = payload;

	const parcel = await prisma.parcel.findUnique({
		where: { id: parcelId },
		include: { transaction: true },
	});
	if (!parcel) {
		throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
	}
	if (parcel.isDeleted) {
		throw new AppError(httpStatus.BAD_REQUEST, "Parcel is deleted");
	}

	const assignableStatuses = ASSIGNABLE_PARCEL_STATUS[leg];
	if (!assignableStatuses.includes(parcel.status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`A ${leg} assignment requires the parcel to be ${assignableStatuses.join(
				" or ",
			)}. Current status: ${parcel.status}`,
		);
	}

	// Prepaid parcels must be paid before they can move.
	if (
		parcel.paymentType === PaymentType.PREPAID &&
		parcel.transaction?.status !== "PAID"
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only paid parcels can be assigned",
		);
	}

	// Only one active assignment per parcel + leg at a time.
	const activeAssignment = await prisma.assignment.findFirst({
		where: {
			parcelId,
			leg,
			status: { in: ACTIVE_ASSIGNMENT_STATUSES },
		},
	});
	if (activeAssignment) {
		throw new AppError(
			httpStatus.CONFLICT,
			`This parcel already has an active ${leg} assignment. Cancel it before assigning another rider.`,
		);
	}

	// Do not re-offer this leg to a rider who has already rejected it.
	const priorRejection = await prisma.assignment.findFirst({
		where: {
			parcelId,
			leg,
			riderId,
			status: AssignmentStatus.REJECTED,
		},
	});
	if (priorRejection) {
		throw new AppError(
			httpStatus.CONFLICT,
			"This rider has already rejected this parcel. Please assign a different rider.",
		);
	}

	const rider = await prisma.riderProfile.findUnique({
		where: { id: riderId },
	});
	if (!rider) {
		throw new AppError(httpStatus.NOT_FOUND, "Rider not found");
	}
	if (rider.applicationStatus !== "APPROVED") {
		throw new AppError(httpStatus.BAD_REQUEST, "Rider is not approved");
	}
	if (rider.isDeleted) {
		throw new AppError(httpStatus.BAD_REQUEST, "Rider is deleted");
	}

	// attemptNumber reflects how many times this leg has been assigned so far.
	const priorAttempts = await prisma.assignment.count({
		where: { parcelId, leg },
	});

	const assignment = await prisma.assignment.create({
		data: {
			parcelId,
			riderId,
			leg,
			status: AssignmentStatus.ASSIGNED,
			attemptNumber: priorAttempts + 1,
			assignedById: assignedBy,
		},
	});

	return assignment;
};

// ── Rider: accept an offer ────────────────────────────────
// Accepting a PICKUP moves the parcel to PICKUP_ASSIGNED.

const acceptAssignment = async (assignmentId: string, userId: string) => {
	const rider = await resolveRiderProfile(userId);
	const assignment = await getOwnedAssignment(assignmentId, rider.id);

	assertTransition(assignment.status, AssignmentStatus.ACCEPTED);

	return prisma.$transaction(async (tx) => {
		const nextAssignment = await tx.assignment.update({
			where: { id: assignment.id },
			data: {
				status: AssignmentStatus.ACCEPTED,
				acceptedAt: new Date(),
			},
		});

		if (
			assignment.leg === "PICKUP" &&
			assignment.parcel.status === ParcelStatus.CREATED
		) {
			await tx.parcel.update({
				where: { id: assignment.parcelId },
				data: { status: ParcelStatus.PICKUP_ASSIGNED },
			});
		}

		return nextAssignment;
	});
};

// ── Rider: start the leg ──────────────────────────────────
// Starting a DELIVERY puts the parcel OUT_FOR_DELIVERY.

const startAssignment = async (assignmentId: string, userId: string) => {
	const rider = await resolveRiderProfile(userId);
	const assignment = await getOwnedAssignment(assignmentId, rider.id);

	assertTransition(assignment.status, AssignmentStatus.IN_PROGRESS);

	return prisma.$transaction(async (tx) => {
		const nextAssignment = await tx.assignment.update({
			where: { id: assignment.id },
			data: {
				status: AssignmentStatus.IN_PROGRESS,
				startedAt: new Date(),
			},
		});

		if (
			assignment.leg === "DELIVERY" &&
			assignment.parcel.status === ParcelStatus.AT_HUB
		) {
			await tx.parcel.update({
				where: { id: assignment.parcelId },
				data: { status: ParcelStatus.OUT_FOR_DELIVERY },
			});
		}

		return nextAssignment;
	});
};

// ── Rider: complete the leg ───────────────────────────────
// PICKUP -> parcel PICKED_UP; DELIVERY -> parcel DELIVERED.

const completeAssignment = async (assignmentId: string, userId: string) => {
	const rider = await resolveRiderProfile(userId);
	const assignment = await getOwnedAssignment(assignmentId, rider.id);

	assertTransition(assignment.status, AssignmentStatus.COMPLETED);

	return prisma.$transaction(async (tx) => {
		const nextAssignment = await tx.assignment.update({
			where: { id: assignment.id },
			data: {
				status: AssignmentStatus.COMPLETED,
				completedAt: new Date(),
			},
		});

		if (assignment.leg === "PICKUP") {
			await tx.parcel.update({
				where: { id: assignment.parcelId },
				data: { status: ParcelStatus.PICKED_UP },
			});
		} else {
			await tx.parcel.update({
				where: { id: assignment.parcelId },
				data: {
					status: ParcelStatus.DELIVERED,
					deliveredAt: new Date(),
				},
			});
		}

		return nextAssignment;
	});
};

// ── Rider: fail the leg ───────────────────────────────────
// PICKUP failure returns the parcel to the pool (CREATED). DELIVERY failure
// counts the attempt and returns the parcel to the merchant once the max
// re-attempts are exhausted, otherwise leaves it re-assignable.

const failAssignment = async (
	assignmentId: string,
	userId: string,
	reason: string,
) => {
	const rider = await resolveRiderProfile(userId);
	const assignment = await getOwnedAssignment(assignmentId, rider.id);

	assertTransition(assignment.status, AssignmentStatus.FAILED);

	return prisma.$transaction(async (tx) => {
		const nextAssignment = await tx.assignment.update({
			where: { id: assignment.id },
			data: {
				status: AssignmentStatus.FAILED,
				failedAt: new Date(),
				failureReason: reason,
			},
		});

		if (assignment.leg === "PICKUP") {
			await tx.parcel.update({
				where: { id: assignment.parcelId },
				data: {
					status: ParcelStatus.CREATED,
					failureReason: reason,
				},
			});
		} else {
			const parcel = assignment.parcel;
			const nextReattemptCount = parcel.reattemptCount + 1;
			const exhausted = nextReattemptCount >= parcel.maxReattempts;

			await tx.parcel.update({
				where: { id: assignment.parcelId },
				data: {
					status: exhausted
						? ParcelStatus.RETURNED_TO_MERCHANT
						: ParcelStatus.DELIVERY_FAILED,
					reattemptCount: nextReattemptCount,
					failureReason: reason,
					...(exhausted ? { returnedAt: new Date() } : {}),
				},
			});
		}

		return nextAssignment;
	});
};

// ── Rider: reject an offer (only before accepting) ────────
// The parcel status is untouched — it only advances once a rider ACCEPTS — so
// the admin can immediately offer the leg to a different rider. A rider who
// rejects a parcel/leg cannot be re-assigned to it (see createAssignment).

const rejectAssignment = async (
	assignmentId: string,
	userId: string,
	reason?: string,
) => {
	const rider = await resolveRiderProfile(userId);
	const assignment = await getOwnedAssignment(assignmentId, rider.id);

	assertTransition(assignment.status, AssignmentStatus.REJECTED);

	return prisma.assignment.update({
		where: { id: assignment.id },
		data: {
			status: AssignmentStatus.REJECTED,
			rejectedAt: new Date(),
			failureReason: reason ?? null,
		},
	});
};

// ── Rider: list my assignments ────────────────────────────

const getMyAssignments = async (query: IQuery, userId: string) => {
	const rider = await resolveRiderProfile(userId);

	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "assignedAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: AssignmentWhereInput[] = [{ riderId: rider.id }];

	if (query.status) {
		andConditions.push({ status: query.status });
	}
	if (query.leg) {
		andConditions.push({ leg: query.leg });
	}

	const assignments = await prisma.assignment.findMany({
		where: { AND: andConditions },
		take: limit,
		skip,
		orderBy: { [sortBy]: sortOrder },
		include: {
			parcel: {
				select: {
					id: true,
					trackingId: true,
					status: true,
					pickupContactName: true,
					pickupContactPhone: true,
					pickupAddressLine: true,
					pickupDistrict: true,
					pickupCity: true,
					recipientName: true,
					recipientPhone: true,
					deliveryAddressLine: true,
					deliveryDistrict: true,
					deliveryCity: true,
					paymentType: true,
					codAmount: true,
				},
			},
		},
	});

	const total = await prisma.assignment.count({
		where: { AND: andConditions },
	});

	return {
		data: assignments,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

// ── Admin: list all assignments ───────────────────────────

const listAssignments = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "assignedAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: AssignmentWhereInput[] = [];

	if (query.status) {
		andConditions.push({ status: query.status });
	}
	if (query.leg) {
		andConditions.push({ leg: query.leg });
	}
	if (query.riderId) {
		andConditions.push({ riderId: query.riderId });
	}
	if (query.parcelId) {
		andConditions.push({ parcelId: query.parcelId });
	}

	const where = andConditions.length ? { AND: andConditions } : undefined;

	const assignments = await prisma.assignment.findMany({
		where,
		take: limit,
		skip,
		orderBy: { [sortBy]: sortOrder },
		include: {
			parcel: {
				select: { id: true, trackingId: true, status: true },
			},
			rider: {
				select: { id: true, name: true, email: true, phone: true },
			},
		},
	});

	const total = await prisma.assignment.count({ where });

	return {
		data: assignments,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

// ── Admin: cancel an active assignment ────────────────────
// Rolls the parcel back to its pre-assignment state so it can be re-assigned.

const cancelAssignment = async (assignmentId: string, reason?: string) => {
	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: { parcel: true },
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	assertTransition(assignment.status, AssignmentStatus.CANCELLED);

	return prisma.$transaction(async (tx) => {
		const nextAssignment = await tx.assignment.update({
			where: { id: assignment.id },
			data: {
				status: AssignmentStatus.CANCELLED,
				cancelledAt: new Date(),
				failureReason: reason ?? null,
			},
		});

		if (
			assignment.leg === "PICKUP" &&
			assignment.parcel.status === ParcelStatus.PICKUP_ASSIGNED
		) {
			await tx.parcel.update({
				where: { id: assignment.parcelId },
				data: { status: ParcelStatus.CREATED },
			});
		} else if (
			assignment.leg === "DELIVERY" &&
			assignment.parcel.status === ParcelStatus.OUT_FOR_DELIVERY
		) {
			await tx.parcel.update({
				where: { id: assignment.parcelId },
				data: { status: ParcelStatus.AT_HUB },
			});
		}

		return nextAssignment;
	});
};

export const AssignmentService = {
	createAssignment,
	acceptAssignment,
	startAssignment,
	completeAssignment,
	failAssignment,
	rejectAssignment,
	getMyAssignments,
	listAssignments,
	cancelAssignment,
};
