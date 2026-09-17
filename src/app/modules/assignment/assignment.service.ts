import {
	type AssignmentLeg,
	ParcelStatus,
	PaymentType,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateAssignmentPayload } from "./assignment.interface";
import httpStatus from "http-status";

// Which parcel statuses a given assignment leg may be created against.
const ASSIGNABLE_PARCEL_STATUS: Record<AssignmentLeg, ParcelStatus[]> = {
	PICKUP: [ParcelStatus.CREATED],
	DELIVERY: [ParcelStatus.AT_HUB],
};

const createAssignment = async (
	payload: ICreateAssignmentPayload,
	assignedBy: string,
) => {
	const { parcelId, riderId, leg } = payload;
	const parcel = await prisma.parcel.findUnique({
		where: { id: parcelId },
		include: {
			transaction: true,
		},
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
			`A ${leg} assignment requires the parcel to be ${assignableStatuses.join(" or ")}. Current status: ${parcel.status}`,
		);
	}
	if (
		parcel.paymentType === PaymentType.PREPAID &&
		parcel.transaction?.status !== "PAID"
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only paid parcels can be assigned",
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

	const assignment = await prisma.assignment.create({
		data: {
			parcelId,
			riderId,
			leg,
			status: "ASSIGNED",
			attemptNumber: 1,
			assignedById: assignedBy,
		},
	});

	return assignment;
};

export const AssignmentService = {
	createAssignment,
};
