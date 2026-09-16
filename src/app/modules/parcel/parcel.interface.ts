import type {
	DeliveryType,
	ParcelCategory,
	PaymentType,
	PickupMode,
	ZoneType,
} from "../../../generated/prisma/enums";

export interface ICreateParcelPayload {
	// ── Pickup ────────────────────────────────────────────────
	pickupContactName: string;
	pickupContactPhone: string;
	pickupAddressLine: string;
	pickupDistrict: string;
	pickupCity: string;
	pickupMode?: PickupMode; // defaults to RIDER_PICKUP
	note?: string;

	// ── Recipient / delivery ──────────────────────────────────
	recipientName: string;
	recipientPhone: string;
	recipientEmail: string;
	deliveryAddressLine: string;
	deliveryDistrict: string;
	deliveryCity: string;
	// Zone that pricing is resolved against. Supplied by the client for now;
	// can later be derived server-side from delivery district/city.
	deliveryZoneType: ZoneType;

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
