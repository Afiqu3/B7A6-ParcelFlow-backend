import cron from "node-cron";
import { RiderApplicationStatus, Role } from "../../generated/prisma/enums";
import { prisma } from "./prisma";

export const deleteUnverifiedRiders = async () => {
	cron.schedule("*/10 * * * *", async () => {
		try {
			const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
			const deletedRiders = await prisma.user.deleteMany({
				where: {
					role: Role.RIDER,
					emailVerified: false,
					createdAt: { lt: oneHourAgo },
					riderProfile: {
						applicationStatus: RiderApplicationStatus.PENDING,
					},
				},
			});

			if (deletedRiders.count > 0) {
				console.log(`
                Cron: Deleted ${deletedRiders.count} unverified email rider applications older than 1 hour
                `);
			}
		} catch (error) {
			console.log(
				"Cron: Failed to delete unverified rider applications",
				error,
			);
		}

		console.log("Unverified Rider Delete cron schedule (every 10 minutes)");
	});
};

export const deleteRejectedRiders = async () => {
	cron.schedule("*/10 * * * *", async () => {
		try {
			const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
			const deletedRiders = await prisma.user.deleteMany({
				where: {
					role: Role.RIDER,
					emailVerified: true,
					createdAt: { lt: oneMonthAgo },
					riderProfile: {
						applicationStatus: RiderApplicationStatus.REJECTED,
					},
				},
			});

			if (deletedRiders.count > 0) {
				console.log(`
                Cron: Deleted ${deletedRiders.count} rejected rider applications older than 1 month
                `);
			}
		} catch (error) {
			console.log("Cron: Failed to delete rejected rider applications", error);
		}
		console.log("Rejected Rider Delete cron schedule (every 10 minutes)");
	});
};
