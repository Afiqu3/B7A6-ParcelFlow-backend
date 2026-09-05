import type { Role } from "../../../generated/prisma/enums";

export interface ILoginUserPayload {
	email: string;
	password: string;
}

export interface IRegisterMerchantPayload {
	id: string;
	name: string;
	email: string;
	password: string;
	merchantProfile: IMerchantProfile;
}

interface IMerchantProfile {
	businessName?: string;
	phone: string;
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}

export interface IRequestUser {
	userId: string;
	email: string;
	name: string;
	role: Role;
}
