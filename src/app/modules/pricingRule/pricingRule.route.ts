import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PricingRuleController } from "./pricingRule.controller";
import { PricingRuleValidations } from "./pricingRule.validation";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(PricingRuleValidations.createPricingRuleZodSchema),
	PricingRuleController.createPricingRule,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	PricingRuleController.getAllPricingRules,
);

router.patch(
	"/:ruleId",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(PricingRuleValidations.updatePricingRuleZodSchema),
	PricingRuleController.updatePricingRule,
);

export const PricingRuleRoutes = router;
