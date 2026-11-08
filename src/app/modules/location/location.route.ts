import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { LocationController } from "./location.controller";
import {
	districtIdQuerySchema,
	divisionIdQuerySchema,
} from "./location.validation";

const router = Router();

router.get("/divisions", LocationController.getDivisions);
router.get(
	"/districts",
	validateRequest(divisionIdQuerySchema, "query"),
	LocationController.getDistricts,
);
router.get(
	"/cities",
	validateRequest(districtIdQuerySchema, "query"),
	LocationController.getCities,
);

export const LocationRoutes = router;
