import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.post(
	"/",
	auth(Role.SUPER_ADMIN, Role.ADMIN),
	validateRequest(AdminValidation.CreateAdminZodSchema),
	AdminController.createAdmin,
);

router.post(
	"/super-admin",
	auth(Role.SUPER_ADMIN),
	validateRequest(AdminValidation.CreateAdminZodSchema),
	AdminController.createAdmin,
);

export const AdminRoutes = router;
