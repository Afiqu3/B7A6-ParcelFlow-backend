import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const showProfile = async (userId: string) => {
	const isRiderExists = await prisma.user.findUnique({
		where: {
			id: userId,
			role: Role.MERCHANT,
		},
		omit: {
			password: true,
		},
		include: {
			merchantProfile: true,
		},
	});
	if (!isRiderExists) {
		throw new AppError(httpStatus.NOT_FOUND, "merchant Not Found");
	}

	if (!isRiderExists.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "merchant Email Not Verified");
	}

	if (isRiderExists.isDeleted) {
		throw new AppError(httpStatus.BAD_REQUEST, "merchant Account Deleted");
	}

	return isRiderExists;
};

export const MerchantService = {
	showProfile,
};
