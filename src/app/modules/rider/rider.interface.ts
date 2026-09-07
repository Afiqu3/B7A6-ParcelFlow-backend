import type { VehicleType } from "../../../generated/prisma/enums";

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
