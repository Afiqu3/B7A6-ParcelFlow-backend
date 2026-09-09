import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { MerchantController } from "./merchant.controller";

const router = Router();

router.get("/profile", auth(Role.MERCHANT), MerchantController.showProfile);

export const MerchantRoutes = router;
