import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AdminRoutes } from "./app/modules/admin/admin.route";
import { AuthRoutes } from "./app/modules/auth/auth.route";
import { RiderRoutes } from "./app/modules/rider/rider.route";
import { UserRoutes } from "./app/modules/user/user.route";
import { MerchantRoutes } from "./app/modules/merchant/merchant.route";
import { PricingRuleRoutes } from "./app/modules/pricingRule/pricingRule.route";
import { ParcelRoutes } from "./app/modules/parcel/parcel.route";
import { AssignmentRoutes } from "./app/modules/assignment/assignment.route";
import { StatsRoutes } from "./app/modules/stats/stats.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/admin", AdminRoutes);
app.use("/api/v1/rider", RiderRoutes);
app.use("/api/v1/merchant", MerchantRoutes);
app.use("/api/v1/rule", PricingRuleRoutes);
app.use("/api/v1/parcel", ParcelRoutes);
app.use("/api/v1/assignment", AssignmentRoutes);
app.use("/api/v1/stats", StatsRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to ParcelFlow System Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
