import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { TransactionController } from "./transaction.controller";

const router = Router();

router.get(
	"/my-transactions",
	auth(Role.MERCHANT),
	TransactionController.getMyTransactions,
);

router.get(
	"/all-transactions",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	TransactionController.getAllTransactions,
);

router.get(
	"/:paymentId",
	auth(Role.MERCHANT, Role.ADMIN, Role.SUPER_ADMIN),
	TransactionController.getSingleTransaction,
);

export const TransactionRoutes = router;
