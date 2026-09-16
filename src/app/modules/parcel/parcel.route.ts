import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { ParcelController } from "./parcel.controller";

const router = Router();

router.post(
  "/create-parcel",
  auth(Role.MERCHANT),
  ParcelController.createParcel,
);

router.get(
	"/payment/callback",
	ParcelController.paymentCallback,
);

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
	"/my-parcels",
	auth(Role.MERCHANT),
	ParcelController.getMyParcels,
);

export const ParcelRoutes = router;
