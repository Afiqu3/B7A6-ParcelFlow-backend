import type {
	DeliveryType,
	ParcelCategory,
	PaymentType,
	PickupMode,
} from "../../../generated/prisma/enums";

export interface ICreateParcelPayload {
	// ── Pickup ────────────────────────────────────────────────
	pickupContactName: string;
	pickupContactPhone: string;
	pickupAddressLine: string;
	pickupCityId: string;
	pickupMode?: PickupMode; // defaults to RIDER_PICKUP
	note?: string;

	// ── Recipient / delivery ──────────────────────────────────
	recipientName: string;
	recipientPhone: string;
	recipientEmail: string;
	deliveryAddressLine: string;
	deliveryCityId: string;

	// ── Shipment / item ───────────────────────────────────────
	parcelCategory: ParcelCategory;
	weightKg: number;
	itemDescription: string;
	itemQuantity?: number; // defaults to 1
	declaredValue?: number;
	deliveryType?: DeliveryType; // defaults to REGULAR

	// ── Payment ───────────────────────────────────────────────
	paymentType: PaymentType;
	codAmount?: number; // required (> 0) when paymentType === "COD"
}

export interface IParcelStatusUpdateByAdminPayload {
	status: "AT_HUB" | "IN_TRANSIT";
}
