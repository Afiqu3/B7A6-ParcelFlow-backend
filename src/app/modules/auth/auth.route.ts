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

router.post("/refresh", AuthController.refreshToken);

router.post("/google", AuthController.googleLogin);

router.post(
	"/forgot-password",
	validateRequest(UserValidation.ForgotPasswordZodSchema),
	AuthController.forgotPassword,
);

router.post(
	"/reset-password",
	validateRequest(UserValidation.ResetPasswordZodSchema),
	AuthController.resetPassword,
);

export const AuthRoutes = router;
