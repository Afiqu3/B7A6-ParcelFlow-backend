import { Router } from "express";
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

export const AuthRoutes = router;
