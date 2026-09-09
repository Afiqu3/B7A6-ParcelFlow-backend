import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { RiderController } from "./rider.controller";
import { RiderValidation } from "./rider.validation";

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

router.get("/profile", auth(Role.RIDER), RiderController.showProfile);

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

router.get(
	"/:riderId",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	RiderController.getRiderProfile,
);

router.patch(
	"/:userId/status",
	auth(Role.SUPER_ADMIN, Role.ADMIN),
	RiderController.updateRiderStatus,
);

export const RiderRoutes = router;
