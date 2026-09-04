import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import {
    IRegisterMerchantPayload,
    IVerifyEmailPayload,
} from "./auth.interface";
import { AccountStatus, Role } from "../../../generated/prisma/enums";
import { jwtUtils } from "../../utils/jwt";
import { SignOptions } from "jsonwebtoken";

const registerMerchant = async (payload: IRegisterMerchantPayload) => {
    const { name, password, merchantProfile: merchantData } = payload;
    const email = payload.email.trim().toLowerCase();

    const isUserExists = await prisma.user.findUnique({
        where: { email },
    });

    if (isUserExists) {
        throw new AppError(
            httpStatus.CONFLICT,
            "User with this email already exists",
        );
    }

    const hashedPassword = await bcrypt.hash(
        password,
        Number(config.bcrypt_salt_rounds),
    );

    const expirationSeconds = 5 * 60;

    const otpKey = `merchant-registration-otp:${email}`;
    const otpValue = crypto.randomInt(100000, 1000000).toString();

    await redisClient.set(otpKey, otpValue, {
        expiration: {
            type: "EX",
            value: expirationSeconds,
        },
    });

    const merchantRegistrationKey = `merchant-registration-data:${email}`;

    const redisUserDataPayload = {
        name,
        email,
        password: hashedPassword,
        merchant: merchantData,
    };

    await redisClient.set(
        merchantRegistrationKey,
        JSON.stringify(redisUserDataPayload),
        {
            expiration: {
                type: "EX",
                value: expirationSeconds,
            },
        },
    );

    const templatePath = path.join(
        process.cwd(),
        "src/app/templates/registration-user-otp.ejs",
    );

    const templateData = {
        name,
        email,
        otp: otpValue,
        expirationMinutes: expirationSeconds / 60,
    };

    const html = await ejs.renderFile(templatePath, templateData);

    await transporter.sendMail({
        from: '"ParcelFlow" <noreply@parcelflow.com>',
        to: email,
        subject: "Email Verification",
        html,
    });
};

const verifyMerchantEmail = async (payload: IVerifyEmailPayload) => {
    const otp = payload.otp;
    const email = payload.email.trim().toLowerCase();

    const isUserExist = await prisma.user.findUnique({
        where: { email },
    });

    if (isUserExist?.status === "BLOCKED") {
        throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
    }

    if (isUserExist?.emailVerified) {
        throw new AppError(httpStatus.CONFLICT, "Email ALready Verified");
    }

    if (isUserExist?.isDeleted) {
        throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
    }

    const otpKey = `merchant-registration-otp:${email}`;
    const redisOtp = await redisClient.get(otpKey);

    if (!redisOtp) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
    }

    if (redisOtp !== otp) {
        throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
    }

    await redisClient.del(otpKey);

    const merchantRegistrationKey = `merchant-registration-data:${email}`;

    const redisMerchantData = await redisClient.get(merchantRegistrationKey);

    if (!redisMerchantData) {
        throw new AppError(httpStatus.NOT_FOUND, "Merchant Doesn't Exist");
    }

    const merchantPayload: IRegisterMerchantPayload =
        JSON.parse(redisMerchantData);

    const createdUser = await prisma.user.create({
        data: {
            name: merchantPayload.name,
            email: merchantPayload.email,
            password: merchantPayload.password,
            role: Role.MERCHANT,
            status: AccountStatus.ACTIVE,
            emailVerified: true,
            merchantProfile: {
                create: {
                    name: merchantPayload.name,
                    email: merchantPayload.email,
                    phone: merchantPayload.merchantProfile.phone,
                },
            },
        },
        omit: { password: true },
        include: { merchantProfile: true },
    });

    await redisClient.del(merchantRegistrationKey);

    const templatePath = path.join(
        process.cwd(),
        "src/app/templates/merchant-welcome-email.ejs",
    );

    const templateData = {
        name: createdUser.name,
    };

    const html = await ejs.renderFile(templatePath, templateData);

    await transporter.sendMail({
        from: config.email_sender,
        to: email,
        subject: "Welcome To ParcelFlow",
        html,
    });

    const { merchantProfile, ...user } = createdUser;
    const jwtPayload = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };

    const accessToken = jwtUtils.createToken(
        jwtPayload,
        config.jwt_access_secret,
        config.jwt_access_expires_in as SignOptions,
    );

    const refreshToken = jwtUtils.createToken(
        jwtPayload,
        config.jwt_refresh_secret,
        config.jwt_refresh_expires_in as SignOptions,
    );

    return {
        user,
        merchantProfile,
        accessToken,
        refreshToken,
    };
};

export const AuthService = {
    registerMerchant,
    verifyMerchantEmail,
};
