import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validate";

const router = Router();

router.post(
	"/register",
	validateRequest(UserValidation.MerchantRegistrationZodSchema),
	AuthController.registerMerchant,
);

router.post(
	"/verify-otp",
	validateRequest(UserValidation.MerchantEmailVerifyZodSchema),
	AuthController.verifyMerchantEmail,
);

router.post(
	"/login",
	validateRequest(UserValidation.LoginZodSchema),
	AuthController.loginUser,
);
router.get(
	"/me",
	auth(Role.ADMIN, Role.RIDER, Role.MERCHANT, Role.SUPER_ADMIN),
	AuthController.getMe,
);

export const AuthRoutes = router;
