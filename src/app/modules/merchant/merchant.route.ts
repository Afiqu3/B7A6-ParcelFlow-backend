import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { MerchantController } from "./merchant.controller";
import { MerchantValidation } from "./merchant.validation";

const router = Router();

router.get("/profile", auth(Role.MERCHANT), MerchantController.showProfile);

router.patch(
	"/update-profile",
	auth(Role.MERCHANT),
	validateRequest(MerchantValidation.updateMerchantProfileValidationSchema),
	MerchantController.updateMerchantProfile,
);

export const MerchantRoutes = router;
