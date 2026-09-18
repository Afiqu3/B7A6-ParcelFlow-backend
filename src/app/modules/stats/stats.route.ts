import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { StatsController } from "./stats.controller";

const router = Router();

router.get(
	"/admin",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	StatsController.getAdminStats,
);

router.get("/merchant", auth(Role.MERCHANT), StatsController.getMerchantStats);

router.get("/rider", auth(Role.RIDER), StatsController.getRiderStats);

export const StatsRoutes = router;
