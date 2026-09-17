import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { ParcelController } from "./parcel.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { ParcelValidation } from "./parcel.validation";

const router = Router();

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ParcelController.listParcels,
);

router.get("/my-parcels", auth(Role.MERCHANT), ParcelController.getMyParcels);

router.get(
	"/:parcelId",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ParcelController.getSingleParcelAsAdmin,
);

router.post(
	"/create-parcel",
	auth(Role.MERCHANT),
	validateRequest(ParcelValidation.CreateParcelZodValidationSchema),
	ParcelController.createParcel,
);

router.get(
	"/:parcelId/merchant",
	auth(Role.MERCHANT),
	ParcelController.getSingleParcelAsMerchant,
);

router.get("/payment/callback", ParcelController.paymentCallback);

router.post(
	"/:parcelId/pay",
	auth(Role.MERCHANT),
	ParcelController.initiateParcelPayment,
);

router.post(
	"/:parcelId/cancel",
	auth(Role.MERCHANT),
	ParcelController.cancelParcel,
);

router.get(
	"/:trackingId/track",
	auth(Role.MERCHANT),
	ParcelController.trackParcel,
);

router.delete("/:parcelId", auth(Role.MERCHANT), ParcelController.deleteParcel);

export const ParcelRoutes = router;
