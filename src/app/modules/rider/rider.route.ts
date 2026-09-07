import { Router } from "express";
import { upload } from "../../lib/multer";
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

export const RiderRoutes = router;
