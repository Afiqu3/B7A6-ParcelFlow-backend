export interface IAdminCreatePayload {
	name: string;
	email: string;
	password: string;
	personalEmail: string;
}

export interface IAdminUpdatePayload {
	name?: string;
}
