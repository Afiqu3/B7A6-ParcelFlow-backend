import type {
	RiderApplicationStatus,
	VehicleType,
} from "../../../generated/prisma/enums";

export interface IApplyAsRiderPayload {
	user: {
		name: string;
		email: string;
	};
	riderProfile: {
		phone: string;
		address?: string;
		nid: string;
		licenseNumber: string;
		vehicleType: VehicleType;
	};
}

export interface IVerifyRiderEmailPayload {
	email: string;
	otp: string;
}

export interface IApproveRiderPayload {
	riderId: string;
	applicationStatus: RiderApplicationStatus;
	rejectionReason?: string;
}

export interface IRiderUpdatePayload {
	name?: string;
	phone?: string;
	address?: string;
}
