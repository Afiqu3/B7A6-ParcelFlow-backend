import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";

export const seedSuperAdmin = async () => {
	try {
		const isSuperAdminExist = await prisma.user.findFirst({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});

		if (isSuperAdminExist) {
			console.log("Super Admin Already Exists!");
			return;
		}

		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Super Admin Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const superAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.SUPER_ADMIN,
				mustChangePassword: false,
				emailVerified: true,
			},
		});

		console.log("Super Admin Created : ", superAdmin);
	} catch (error) {
		console.log("Error Seeding Super Admin : ", error);

		await prisma.user.delete({
			where: {
				email: config.super_admin_email,
			},
		});
	}
};

export const seedTesterAdmin = async () => {
	try {
		const isTesterAdminExist = await prisma.user.findUnique({
			where: {
				email: config.tester_admin_email,
			},
		});

		if (isTesterAdminExist) {
			console.log("Tester Admin Already Exists!");
			return;
		}

		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Admin Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.ADMIN,
				mustChangePassword: false,
				emailVerified: true,
			},
		});

		console.log("Tester Admin Created : ", testerAdmin);
	} catch (error) {
		console.log("Error Seeding Tester Admin : ", error);

		await prisma.user.delete({
			where: {
				email: config.tester_admin_email,
			},
		});
	}
};

export const seedTesterRider = async () => {
	try {
		const isTesterRiderExist = await prisma.user.findUnique({
			where: {
				email: config.tester_rider_email,
			},
		});

		if (isTesterRiderExist) {
			console.log("Tester Rider Already Exists!");
			return;
		}

		const name = config.tester_rider_name;
		const email = config.tester_rider_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Rider Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerRider = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.RIDER,
				mustChangePassword: false,
				emailVerified: true,
				// merchantProfile: {
				// 	create: {
				// 		email,
				// 		name,
				// 		phone: "01712345678",
				// 	},
				// },
			},
		});

		console.log("Tester Rider Created : ", testerRider);
	} catch (error) {
		console.log("Error Seeding Tester Rider : ", error);

		await prisma.user.delete({
			where: {
				email: config.tester_rider_email,
			},
		});
	}
};
