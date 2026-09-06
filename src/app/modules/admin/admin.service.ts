import bcrypt from "bcryptjs";
import ejs from "ejs";
import path from "path";
import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import type { IAdminCreatePayload } from "./admin.interface";

const createAdmin = async (payload: IAdminCreatePayload) => {
	const { name, email, password, personalEmail } = payload;

	const hashedPassword = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds),
	);

	const admin = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.ADMIN,
			emailVerified: true,
			mustChangePassword: true,
		},
		omit: {
			password: true,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/admin-welcome-email.ejs",
	);

	const templateData = {
		name: admin.name,
		email: admin.email,
		role: admin.role,
		password,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: '"ParcelFlow" <noreply@parcelflow.com>',
		to: personalEmail,
		subject: "Welcome To ParcelFlow",
		html,
	});
};

const createSuperAdmin = async (payload: IAdminCreatePayload) => {
	const { name, email, password, personalEmail } = payload;

	const hashedPassword = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds),
	);

	const admin = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.SUPER_ADMIN,
			emailVerified: true,
			mustChangePassword: true,
		},
		omit: {
			password: true,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/admin-welcome-email.ejs",
	);

	const templateData = {
		name: admin.name,
		email: admin.email,
		role: admin.role,
		password,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: '"ParcelFlow" <noreply@parcelflow.com>',
		to: personalEmail,
		subject: "Welcome To ParcelFlow",
		html,
	});
};

export const AdminService = {
	createAdmin,
	createSuperAdmin,
};
