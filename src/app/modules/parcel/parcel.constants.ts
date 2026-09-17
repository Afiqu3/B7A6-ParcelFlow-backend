import { ParcelStatus } from "../../../generated/prisma/enums";
import type { IParcelStatusUpdateByAdminPayload } from "./parcel.interface";

// Which current statuses may transition INTO each admin-settable status.
// Cancellation is intentionally NOT here — it goes through the dedicated admin
// cancel endpoint so refunds are never skipped.
export const ADMIN_STATUS_TRANSITIONS: Record<
	IParcelStatusUpdateByAdminPayload["status"],
	ParcelStatus[]
> = {
	AT_HUB: [ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT],
	IN_TRANSIT: [ParcelStatus.AT_HUB, ParcelStatus.PICKED_UP],
};
