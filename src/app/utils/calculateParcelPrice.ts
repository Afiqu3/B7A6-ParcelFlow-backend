import httpStatus from "http-status";
import {
    DeliveryType,
    PaymentType,
    PickupMode,
    ZoneType,
} from "../../generated/prisma/enums";
import { AppError } from "./AppError";

export interface ICalculateParcelPriceInput {
    weightKg: number;
    deliveryType: DeliveryType;
    pickupMode: PickupMode;
    paymentType: PaymentType;
    codAmount?: number; // only for COD; undefined/0 for PREPAID
    deliveryZoneType: ZoneType;
}

// ── What a PricingRule looks like (subset of the DB model) ─
export interface IPricingRuleSnapshot {
    baseWeightKg: number;
    baseCharge: number;
    perKgCharge: number;
    expressSurcharge: number;
    sameDaySurcharge: number;
    riderPickupCharge: number;
    codFeePercent: number;
}

// ── What the function returns ─────────────────────────────
export interface IPricingBreakdown {
    deliveryZoneType: ZoneType;
    baseCharge: number;
    weightCharge: number;
    deliveryTypeSurcharge: number;
    pickupModeCharge: number;
    codFee: number;
    totalCharge: number;
}

/**
 * Compute the full, frozen price breakdown for a parcel.
 *
 * Pure function — no DB, no I/O, no side effects.
 *
 * Formula:
 *   weightCharge          = ceil(max(weightKg − baseWeightKg, 0)) × perKgCharge
 *   deliveryTypeSurcharge = EXPRESS ? expressSurcharge
 *                         : SAME_DAY ? sameDaySurcharge
 *                         : 0
 *   pickupModeCharge      = RIDER_PICKUP ? riderPickupCharge : 0
 *   codFee                = PREPAID ? 0 : (codAmount × codFeePercent / 100)
 *   totalCharge           = baseCharge + weightCharge + deliveryTypeSurcharge
 *                         + pickupModeCharge + codFee
 *
 * All amounts returned are rounded to 2 decimal places (BDT convention).
 */
export function calculateParcelPrice(
    rule: IPricingRuleSnapshot,
    input: ICalculateParcelPriceInput,
): IPricingBreakdown {
    // ── Validate inputs (defensive) ───────────────────────────
    if (input.weightKg <= 0) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Weight must be greater than 0",
        );
    }

    if (rule.baseWeightKg <= 0) {
        throw new AppError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Pricing rule has invalid baseWeightKg",
        );
    }

    // ── 1. Base charge ────────────────────────────────────────
    const baseCharge = round2(rule.baseCharge);

    // ── 2. Weight charge (ceiling of extra kg × per-kg rate) ──
    const extraKg = Math.max(0, input.weightKg - rule.baseWeightKg);
    const billableExtraKg = Math.ceil(extraKg - 1e-9); // epsilon guards float noise
    const weightCharge = round2(billableExtraKg * rule.perKgCharge);

    // ── 3. Delivery type surcharge ────────────────────────────
    const deliveryTypeSurcharge = round2(
        input.deliveryType === "EXPRESS"
            ? rule.expressSurcharge
            : input.deliveryType === "SAME_DAY"
              ? rule.sameDaySurcharge
              : 0,
    );

    // ── 4. Pickup mode charge ─────────────────────────────────
    const pickupModeCharge = round2(
        input.pickupMode === "RIDER_PICKUP" ? rule.riderPickupCharge : 0,
    );

    // ── 5. COD fee ────────────────────────────────────────────
    let codFee = 0;
    if (input.paymentType === "COD") {
        const codAmount = input.codAmount ?? 0;
        if (codAmount <= 0) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                "COD amount is required for COD parcels",
            );
        }
        codFee = round2((codAmount * rule.codFeePercent) / 100);
    } else if (input.codAmount && input.codAmount > 0) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Prepaid parcels cannot have a COD amount",
        );
    }

    // ── 6. Total ──────────────────────────────────────────────
    const totalCharge = round2(
        baseCharge +
            weightCharge +
            deliveryTypeSurcharge +
            pickupModeCharge +
            codFee,
    );

    if (totalCharge < 0) {
        throw new AppError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Computed charge is negative — check pricing rule",
        );
    }

    return {
        deliveryZoneType: input.deliveryZoneType,
        baseCharge,
        weightCharge,
        deliveryTypeSurcharge,
        pickupModeCharge,
        codFee,
        totalCharge,
    };
}

// ── Helper: round to 2 decimal places (money convention) ───
function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
