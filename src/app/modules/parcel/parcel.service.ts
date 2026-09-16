import httpStatus from "http-status";
import {
  DeliveryType,
  ParcelStatus,
  PaymentType,
  PickupMode,
  TransactionStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { calculateParcelPrice } from "../../utils/calculateParcelPrice";
import { generateTrackingId } from "../../utils/generateTrackingId";
import type { ICreateParcelPayload } from "./parcel.interface";

const createParcel = async (payload: ICreateParcelPayload, userId: string) => {
  // ── 1. Resolve and validate the authenticated merchant ────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { merchantProfile: true },
  });

  if (!user || !user.merchantProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Merchant profile not found");
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.GONE, "Merchant account has been deleted");
  }

  if (!user.emailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Merchant email is not verified. Parcels cannot be created.",
    );
  }

  // ── 2. Resolve the active pricing rule (zone + category) ──
  const pricingRule = await prisma.pricingRule.findFirst({
    where: {
      zoneType: payload.deliveryZoneType,
      parcelCategory: payload.parcelCategory,
      isActive: true,
    },
  });

  if (!pricingRule) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `No active pricing rule found for ${payload.parcelCategory} parcels in zone ${payload.deliveryZoneType}`,
    );
  }

  // ── 3. Compute the frozen price breakdown ─────────────────
  // Pricing-rule columns are Prisma Decimal; the pure calculator works on
  // numbers. All amounts are derived server-side — never from the client.
  const deliveryType = payload.deliveryType ?? DeliveryType.REGULAR;
  const pickupMode = payload.pickupMode ?? PickupMode.RIDER_PICKUP;

  const priceBreakdown = calculateParcelPrice(
    {
      baseWeightKg: Number(pricingRule.baseWeightKg),
      baseCharge: Number(pricingRule.baseCharge),
      perKgCharge: Number(pricingRule.perKgCharge),
      expressSurcharge: Number(pricingRule.expressSurcharge),
      sameDaySurcharge: Number(pricingRule.sameDaySurcharge),
      riderPickupCharge: Number(pricingRule.riderPickupCharge),
      codFeePercent: Number(pricingRule.codFeePercent),
    },
    {
      weightKg: payload.weightKg,
      deliveryType,
      pickupMode,
      paymentType: payload.paymentType,
      codAmount: payload.codAmount,
      deliveryZoneType: payload.deliveryZoneType,
    },
  );

  const isCod = payload.paymentType === PaymentType.COD;
  const isPrepaid = payload.paymentType === PaymentType.PREPAID;

  // ── 4. Persist the parcel (+ pending transaction) ─────────
  // Only DB writes live in the interactive transaction, so it stays short.
  const parcel = await prisma.$transaction(async (tx) => {
    const created = await tx.parcel.create({
      data: {
        trackingId: generateTrackingId(),
        merchantId: user.merchantProfile!.id,

        // Pickup
        pickupContactName: payload.pickupContactName,
        pickupContactPhone: payload.pickupContactPhone,
        pickupAddressLine: payload.pickupAddressLine,
        pickupMode,
        pickupDistrict: payload.pickupDistrict,
        pickupCity: payload.pickupCity,
        note: payload.note,

        // Recipient / delivery
        recipientName: payload.recipientName,
        recipientPhone: payload.recipientPhone,
        recipientEmail: payload.recipientEmail,
        deliveryAddressLine: payload.deliveryAddressLine,
        deliveryDistrict: payload.deliveryDistrict,
        deliveryCity: payload.deliveryCity,
        deliveryZoneType: payload.deliveryZoneType,

        // Shipment / item
        parcelCategory: payload.parcelCategory,
        weightKg: payload.weightKg,
        itemDescription: payload.itemDescription,
        itemQuantity: payload.itemQuantity ?? 1,
        declaredValue: payload.declaredValue,
        deliveryType,

        // Payment
        paymentType: payload.paymentType,
        codAmount: isCod ? payload.codAmount : null,

        // Frozen price breakdown (server-computed)
        baseCharge: priceBreakdown.baseCharge,
        weightCharge: priceBreakdown.weightCharge,
        deliveryTypeSurcharge: priceBreakdown.deliveryTypeSurcharge,
        pickupModeCharge: priceBreakdown.pickupModeCharge,
        codFee: priceBreakdown.codFee,
        totalCharge: priceBreakdown.totalCharge,
      },
    });

    // Prepaid parcels owe the delivery charge up front — record it as
    // PENDING now (default status). bKash is initiated separately.
    if (isPrepaid) {
      await tx.transaction.create({
        data: {
          parcelId: created.id,
          amount: priceBreakdown.totalCharge,
          merchantInvoiceNumber: created.id,
          payerReference: user.email,
        },
      });
    }

    return created;
  });

  return {
    parcel,
    // Prepaid still needs an online payment; COD is collected on delivery.
    requiresPayment: isPrepaid,
  };
};

const initiateParcelPayment = async (parcelId: string, userId: string) => {
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    include: { merchant: true, transaction: true },
  });

  if (!parcel || parcel.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
  }

  if (parcel.merchant.userId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have access to this parcel",
    );
  }

  if (parcel.paymentType !== PaymentType.PREPAID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only prepaid parcels can be paid online",
    );
  }

  if (parcel.status === ParcelStatus.CANCELLED) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Cannot pay for a cancelled parcel",
    );
  }

  const transaction = parcel.transaction;

  if (!transaction) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "No transaction found for this parcel",
    );
  }

  if (transaction.status === TransactionStatus.PAID) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This parcel has already been paid",
    );
  }
  const bkashIdToken = await getBkashIdToken();

  if (!bkashIdToken) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "No Bkash Access Token Found!",
    );
  }

  const bkashCreatePaymentResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: parcel.merchant.email,
        callbackURL: `${config.bkash_callback_url}/parcel/payment/callback`,
        amount: Number(transaction.amount).toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: transaction.merchantInvoiceNumber,
      }),
    },
  );

  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  if (
    !bkashCreatePaymentResponse.ok ||
    bkashCreatePaymentResult.statusCode !== "0000" ||
    !bkashCreatePaymentResult.paymentID ||
    !bkashCreatePaymentResult.bkashURL
  ) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      bkashCreatePaymentResult?.statusMessage ||
        "Failed to initiate bKash payment",
    );
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      bkashPaymentID: bkashCreatePaymentResult.paymentID,
      bkashResponse: bkashCreatePaymentResult,
      status: TransactionStatus.PENDING,
    },
  });

  return {
    parcelId: parcel.id,
    trackingId: parcel.trackingId,
    amount: Number(transaction.amount),
    paymentUrl: bkashCreatePaymentResult.bkashURL,
    paymentID: bkashCreatePaymentResult.paymentID,
  };
};

const paymentCallback = async (query: Record<string, any>) => {
  const transactionResult = await prisma.$transaction(
    async (tx) => {
      const paymentId = query.paymentID;

      if (!paymentId) {
        throw new AppError(httpStatus.BAD_REQUEST, "Payment Id Missing");
      }

      const status = query.status;

      if (!status) {
        throw new AppError(httpStatus.BAD_REQUEST, "Payment Status is Missing");
      }

      const bkashIdToken = await getBkashIdToken();

      if (!bkashIdToken) {
        throw new AppError(
          httpStatus.BAD_GATEWAY,
          "No Bkash Access Token Found!",
        );
      }

      const executedPaymentResponse = await fetch(
        `${config.bkash_base_url}/tokenized/checkout/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: bkashIdToken,
            "X-App-Key": config.bkash_app_key,
          },

          body: JSON.stringify({
            paymentID: paymentId,
          }),
        },
      );

      const executedPaymentResult = await executedPaymentResponse.json();

      if (status === "success") {
        const parcel = await tx.parcel.findUnique({
          where: {
            id: executedPaymentResult.merchantInvoiceNumber,
          },
        });

        if (!parcel) {
          throw new AppError(httpStatus.NOT_FOUND, "Parcel Not Found!");
        }

        await tx.transaction.update({
          where: {
            parcelId: executedPaymentResult.merchantInvoiceNumber,
            bkashPaymentID: paymentId,
          },
          data: {
            status: TransactionStatus.PAID,
            bkashTrxID: executedPaymentResult.trxID,
            paidAt: executedPaymentResult.paymentExecuteTime,
            bkashResponse: executedPaymentResult,
          },
        });

        return {
          redirectUrl: `${config.frontend_url}/dashboard/my-parcels?status=success`,
        };
      } else if (status === "failure") {
        await tx.transaction.update({
          where: {
            bkashPaymentID: paymentId,
          },
          data: {
            status: TransactionStatus.FAILED,
            bkashResponse: executedPaymentResult,
          },
        });
        return {
          redirectUrl: `${config.frontend_url}/dashboard/my-parcels?status=failue`,
        };
      } else if (status === "cancel") {
        await tx.transaction.update({
          where: {
            bkashPaymentID: paymentId,
          },
          data: {
            status: TransactionStatus.CANCELLED,
            bkashResponse: executedPaymentResult,
          },
        });
        return {
          executedPaymentResult,
          redirectUrl: `${config.frontend_url}/dashboard/my-parcels?status=cancel`,
        };
      } else {
        return {
          executedPaymentResult,
          redirectUrl: `${config.frontend_url}/dashboard/my-parcels?error=payment-failed`,
        };
      }
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );

  return transactionResult;
};

export const ParcelService = {
  createParcel,
  initiateParcelPayment,
  paymentCallback,
};
