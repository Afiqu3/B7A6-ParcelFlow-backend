import app from "./app";
import config from "./app/config";
import { deleteRejectedRiders, deleteUnverifiedRiders } from "./app/lib/cron";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import {
	seedSuperAdmin,
	seedTesterAdmin,
	seedTesterRider,
} from "./app/utils/seed";

const PORT = config.port;

const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		await redisClient.connect();
		console.log("Redis Connected Successfully.");

		await seedSuperAdmin();
		await seedTesterAdmin();
		await seedTesterRider();

		await deleteUnverifiedRiders();
		await deleteRejectedRiders();

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
