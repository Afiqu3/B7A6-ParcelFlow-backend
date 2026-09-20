import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ParcelController } from "./parcel.controller";
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

router.post(
    "/:parcelId/admin-cancel",
    auth(Role.ADMIN, Role.SUPER_ADMIN),
    validateRequest(ParcelValidation.CancelParcelByAdminZodValidationSchema),
    ParcelController.cancelParcelByAdmin,
);

router.get(
    "/:trackingId/track",
    auth(Role.MERCHANT),
    ParcelController.trackParcel,
);

router.get(
    "/:parcelId/invoice",
    auth(Role.MERCHANT),
    ParcelController.downloadParcelInvoice,
);

router.patch(
    "/:parcelId/status",
    auth(Role.ADMIN, Role.SUPER_ADMIN),
    validateRequest(
        ParcelValidation.ParcelStatusUpdateByAdminZodValidationSchema,
    ),
    ParcelController.parcelStatusUpdateByAdmin,
);

router.delete("/:parcelId", auth(Role.MERCHANT), ParcelController.deleteParcel);

export const ParcelRoutes = router;
