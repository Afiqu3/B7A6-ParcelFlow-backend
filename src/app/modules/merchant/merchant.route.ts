import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { MerchantController } from "./merchant.controller";
import { MerchantValidation } from "./merchant.validation";

const router = Router();

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	MerchantController.getAllMerchant,
);

router.get("/profile", auth(Role.MERCHANT), MerchantController.showProfile);

router.patch(
	"/update-profile",
	auth(Role.MERCHANT),
	validateRequest(MerchantValidation.updateMerchantProfileValidationSchema),
	MerchantController.updateMerchantProfile,
);

router.patch(
	"/:userId/status",
	auth(Role.SUPER_ADMIN, Role.ADMIN),
	MerchantController.updateMerchantStatus,
);

export const MerchantRoutes = router;
