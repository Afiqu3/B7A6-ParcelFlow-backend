import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AssignmentController } from "./assignment.controller";
import { AssignmentValidation } from "./assignment.validation";

const router = Router();

// ── Admin ─────────────────────────────────────────────────
router.post(
	"/create-assignment",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(AssignmentValidation.createAssignmentZodValidationSchema),
	AssignmentController.createAssignment,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	AssignmentController.listAssignments,
);

router.patch(
	"/:assignmentId/cancel",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(AssignmentValidation.cancelAssignmentZodValidationSchema),
	AssignmentController.cancelAssignment,
);

// ── Rider ─────────────────────────────────────────────────
router.get(
	"/my-assignments",
	auth(Role.RIDER),
	AssignmentController.getMyAssignments,
);

router.patch(
	"/:assignmentId/accept",
	auth(Role.RIDER),
	AssignmentController.acceptAssignment,
);

router.patch(
	"/:assignmentId/start",
	auth(Role.RIDER),
	AssignmentController.startAssignment,
);

router.patch(
	"/:assignmentId/complete",
	auth(Role.RIDER),
	AssignmentController.completeAssignment,
);

router.patch(
	"/:assignmentId/fail",
	auth(Role.RIDER),
	validateRequest(AssignmentValidation.failAssignmentZodValidationSchema),
	AssignmentController.failAssignment,
);

router.patch(
	"/:assignmentId/reject",
	auth(Role.RIDER),
	validateRequest(AssignmentValidation.rejectAssignmentZodValidationSchema),
	AssignmentController.rejectAssignment,
);

export const AssignmentRoutes = router;
