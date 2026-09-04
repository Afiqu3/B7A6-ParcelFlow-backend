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
