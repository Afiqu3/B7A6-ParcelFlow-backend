import { Router } from "express";
import { upload } from "../../lib/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { RiderController } from "./rider.controller";
import { RiderValidation } from "./rider.validation";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
	"/apply",
	upload.fields([
		{
			name: "vehiclePaper",
			maxCount: 1,
		},
	]),
	RiderController.applyAsRider,
);

router.post(
	"/apply/verify-email",
	validateRequest(RiderValidation.riderEmailValidationSchema),
	RiderController.verifyRiderEmail,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	RiderController.getAllRider,
);

router.get(
	"/:riderId",
	auth(Role.RIDER, Role.ADMIN, Role.SUPER_ADMIN),
	RiderController.getRiderProfile,
);

router.post(
	"/approve",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(RiderValidation.approveRiderValidationSchema),
	RiderController.approveRider,
);

router.patch(
	"/update-profile",
	auth(Role.RIDER),
	validateRequest(RiderValidation.updateRiderValidationSchema),
	RiderController.updateRiderProfile,
);

export const RiderRoutes = router;
