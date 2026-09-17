import { Router } from "express";
import { AssignmentController } from "./assignment.controller";
import { AssignmentValidation } from "./assignment.validation";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/browser";
import { auth } from "../../middleware/checkAuth";

const router = Router();

router.post(
	"/create-assignment",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(AssignmentValidation.createAssignmentZodValidationSchema),
	AssignmentController.createAssignment,
);

export const AssignmentRoutes = router;
