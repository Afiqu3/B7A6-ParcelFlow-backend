import httpStatus from "http-status";
import PDFDocument from "pdfkit";
import {
    DeliveryType,
    ParcelStatus,
    PaymentType,
    PickupMode,
    TransactionStatus,
} from "../../../generated/prisma/enums";
import type { ParcelWhereInput } from "../../../generated/prisma/models";
import config from "../../config";
import type { IQuery } from "../../interfaces";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { calculateParcelPrice } from "../../utils/calculateParcelPrice";
import { generateTrackingId } from "../../utils/generateTrackingId";
import { refundBkashPayment } from "../../utils/refundBkashPayment";
import { ADMIN_STATUS_TRANSITIONS } from "./parcel.constants";
import type {
    ICreateParcelPayload,
    IParcelStatusUpdateByAdminPayload,
} from "./parcel.interface";

// Format a money value for the invoice; null/undefined -> "N/A".
const money = (value: unknown, currency = "BDT"): string =>
    value === null || value === undefined
        ? "N/A"
        : `${currency} ${Number(value).toFixed(2)}`;

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
        throw new AppError(
            httpStatus.GONE,
            "Merchant account has been deleted",
        );
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
                throw new AppError(
                    httpStatus.BAD_REQUEST,
                    "Payment Id Missing",
                );
            }

            const status = query.status;

            if (!status) {
                throw new AppError(
                    httpStatus.BAD_REQUEST,
                    "Payment Status is Missing",
                );
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
                    include: {
                        merchant: true,
                    },
                });

                if (!parcel) {
                    throw new AppError(
                        httpStatus.NOT_FOUND,
                        "Parcel Not Found!",
                    );
                }
				// console.log(executedPaymentResult)

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

/**
 * Cancel a parcel (owning merchant only).
 *
 * Cancellation is allowed only before pickup — i.e. while the parcel is still
 * CREATED or PICKUP_ASSIGNED. A refund is issued only when the parcel is PREPAID
 * and already PAID; COD or unpaid-prepaid parcels are cancelled with no refund.
 */
// Shared cancellation core: refunds (prepaid + paid), voids an unpaid
// transaction, and marks the parcel CANCELLED — atomically. Callers own the
// auth / ownership / eligibility checks BEFORE calling this.
const cancelParcelCore = async (
    parcelId: string,
    actorUserId: string,
    cancelReason?: string,
) => {
    const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
        include: { transaction: true },
    });

    if (!parcel || parcel.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
    }

    const transaction = parcel.transaction;

    // Refund only when the parcel is prepaid AND already paid.
    const shouldRefund =
        parcel.paymentType === PaymentType.PREPAID &&
        transaction?.status === TransactionStatus.PAID;

    let refundResult = null;
    if (shouldRefund) {
        if (!transaction?.bkashPaymentID || !transaction?.bkashTrxID) {
            throw new AppError(
                httpStatus.CONFLICT,
                "Cannot refund: bKash payment/transaction id is missing on the paid transaction",
            );
        }

        refundResult = await refundBkashPayment({
            paymentID: transaction.bkashPaymentID,
            trxID: transaction.bkashTrxID,
            amount: Number(transaction.amount),
            sku: parcel.trackingId,
            reason: cancelReason || "Parcel cancelled",
        });
    }

    // Persist the cancellation (+ refund/void bookkeeping) atomically.
    const cancelledParcel = await prisma.$transaction(async (tx) => {
        const updated = await tx.parcel.update({
            where: { id: parcel.id },
            data: {
                status: ParcelStatus.CANCELLED,
                cancelledAt: new Date(),
                cancelledById: actorUserId,
                cancelReason: cancelReason ?? null,
            },
        });

        if (transaction) {
            if (shouldRefund) {
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: TransactionStatus.REFUNDED,
                        refundedAmount: transaction.amount,
                        refundedAt:
                            refundResult?.completedTime ??
                            new Date().toISOString(),
                        refundReason: cancelReason ?? "Parcel cancelled",
                        refundTxID: refundResult?.refundTrxID,
                    },
                });
            } else if (transaction.status === TransactionStatus.PENDING) {
                // Unpaid prepaid parcel — nothing was collected, so just void it.
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: { status: TransactionStatus.CANCELLED },
                });
            }
        }

        return updated;
    });

    return {
        parcel: cancelledParcel,
        refunded: shouldRefund,
        refundedAmount: shouldRefund ? Number(transaction!.amount) : 0,
    };
};

// Merchant cancel: only the owning merchant, only before pickup.
const cancelParcel = async (
    parcelId: string,
    userId: string,
    cancelReason?: string,
) => {
    const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
        include: { merchant: true },
    });

    if (!parcel || parcel.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
    }

    // Ownership: only the owning merchant can cancel their parcel.
    if (parcel.merchant.userId !== userId) {
        throw new AppError(
            httpStatus.FORBIDDEN,
            "You do not have access to this parcel",
        );
    }

    if (parcel.status === ParcelStatus.CANCELLED) {
        throw new AppError(httpStatus.CONFLICT, "Parcel is already cancelled");
    }

    // Cancellation is only allowed before pickup.
    if (
        parcel.status !== ParcelStatus.CREATED &&
        parcel.status !== ParcelStatus.PICKUP_ASSIGNED
    ) {
        throw new AppError(
            httpStatus.CONFLICT,
            `A parcel can only be cancelled before pickup (while ${ParcelStatus.CREATED} or ${ParcelStatus.PICKUP_ASSIGNED}). Current status: ${parcel.status}`,
        );
    }

    return cancelParcelCore(parcelId, userId, cancelReason);
};

// Admin cancel: any parcel still in flight (not delivered/returned/cancelled).
const cancelParcelByAdmin = async (
    parcelId: string,
    adminUserId: string,
    cancelReason?: string,
) => {
    const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
    });

    if (!parcel || parcel.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
    }

    if (parcel.status === ParcelStatus.CANCELLED) {
        throw new AppError(httpStatus.CONFLICT, "Parcel is already cancelled");
    }

    const nonCancellable: ParcelStatus[] = [
        ParcelStatus.DELIVERED,
        ParcelStatus.RETURNED_TO_MERCHANT,
    ];
    if (nonCancellable.includes(parcel.status)) {
        throw new AppError(
            httpStatus.CONFLICT,
            `A ${parcel.status} parcel can no longer be cancelled`,
        );
    }

    return cancelParcelCore(parcelId, adminUserId, cancelReason);
};

const getMyParcels = async (query: IQuery, userId: string) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const isUserExists = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!isUserExists) {
        throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
    }

    const andConditions: ParcelWhereInput[] = [
        {
            merchant: {
                userId,
            },
            isDeleted: false,
        },
    ];

    if (query.searchTerm) {
        andConditions.push({
            OR: [
                {
                    trackingId: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
            ],
        });
    }

    if (query.status) {
        andConditions.push({
            status: query.status,
        });
    }

    const parcels = await prisma.parcel.findMany({
        where: { AND: andConditions },
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
        include: {
            transaction: true,
        },
    });

    const total = await prisma.parcel.count({
        where: { AND: andConditions },
    });

    return {
        data: parcels,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const listParcels = async (query: IQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: ParcelWhereInput[] = [
        {
            isDeleted: false,
        },
    ];

    if (query.searchTerm) {
        andConditions.push({
            OR: [
                {
                    trackingId: {
                        contains: query.searchTerm,
                        mode: "insensitive",
                    },
                },
            ],
        });
    }

    if (query.status) {
        andConditions.push({
            status: query.status,
        });
    }

    const parcels = await prisma.parcel.findMany({
        where: { AND: andConditions },
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
        include: {
            transaction: true,
        },
    });

    const total = await prisma.parcel.count({
        where: { AND: andConditions },
    });

    return {
        data: parcels,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getSingleParcelAsAdmin = async (parcelId: string) => {
    const idParcelExists = await prisma.parcel.findUnique({
        where: { id: parcelId },
    });

    if (!idParcelExists) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel Not Found");
    }
    if (idParcelExists.isDeleted) {
        throw new AppError(httpStatus.GONE, "Parcel has been deleted");
    }

    const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
        include: {
            transaction: true,
            merchant: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                },
            },
        },
    });

    return parcel;
};

const getSingleParcelAsMerchant = async (parcelId: string, userId: string) => {
    const idParcelExists = await prisma.parcel.findUnique({
        where: {
            id: parcelId,
        },
        include: {
            merchant: true,
        },
    });

    if (!idParcelExists) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel Not Found");
    }

    if (idParcelExists.merchant.userId !== userId) {
        throw new AppError(
            httpStatus.FORBIDDEN,
            "You do not have access to this parcel",
        );
    }

    if (idParcelExists.isDeleted) {
        throw new AppError(httpStatus.GONE, "Parcel has been deleted");
    }

    const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
        include: {
            transaction: true,
        },
    });

    return parcel;
};

const trackParcel = async (trackingId: string, userId: string) => {
    const parcel = await prisma.parcel.findUnique({
        where: { trackingId },
        include: {
            transaction: true,
            merchant: true,
        },
    });

    if (!parcel) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel Not Found");
    }

    if (parcel.isDeleted) {
        throw new AppError(httpStatus.GONE, "Parcel has been deleted");
    }

    if (parcel.merchant.userId !== userId) {
        throw new AppError(
            httpStatus.FORBIDDEN,
            "You are not the owner of this parcel",
        );
    }

    return {
        status: parcel.status,
        trackingId: parcel.trackingId,
    };
};

const deleteParcel = async (parcelId: string, userId: string) => {
    const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
        include: { merchant: true, transaction: true },
    });

    if (!parcel) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
    }

    if (parcel.transaction?.status === TransactionStatus.REFUNDED) {
        throw new AppError(
            httpStatus.CONFLICT,
            "Cannot delete a refunded parcel — it has already been cancelled",
        );
    }

    if (parcel.transaction?.status === TransactionStatus.PAID) {
        throw new AppError(
            httpStatus.CONFLICT,
            "Cannot delete a paid parcel — cancel it first to trigger a refund",
        );
    }

    if (parcel.merchant.userId !== userId) {
        throw new AppError(
            httpStatus.FORBIDDEN,
            "You do not have access to this parcel",
        );
    }

    if (parcel.isDeleted) {
        throw new AppError(httpStatus.GONE, "Parcel has already been deleted");
    }

    if (parcel.status !== ParcelStatus.CREATED) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Only created parcels can be deleted",
        );
    }

    await prisma.parcel.update({
        where: { id: parcelId },
        data: { isDeleted: true, deletedAt: new Date() },
    });
};

const downloadParcelInvoice = async (parcelId: string, userId: string) => {
    const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
        include: { merchant: true, transaction: true },
    });

    if (!parcel) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
    }

    if (parcel.merchant.userId !== userId) {
        throw new AppError(
            httpStatus.FORBIDDEN,
            "You do not have access to this parcel",
        );
    }

    if (parcel.isDeleted) {
        throw new AppError(httpStatus.GONE, "Parcel has been deleted");
    }

    const currency = parcel.transaction?.currency ?? "BDT";

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const pdfChunks: Buffer[] = [];

    const pdfReadyPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on("data", (chunk: Buffer) => pdfChunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(pdfChunks)));
        doc.on("error", reject);
    });

    // -- Header --------------------------------------------------
    doc.fontSize(20).text("ParcelFlow", { align: "center" });
    doc.fontSize(14).text("Parcel Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(10);
    if (parcel.transaction?.merchantInvoiceNumber) {
        doc.text(`Invoice No: ${parcel.transaction.merchantInvoiceNumber}`);
    }
    doc.text(`Invoice Date: ${new Date().toISOString().slice(0, 10)}`);
    doc.text(`Tracking ID: ${parcel.trackingId}`);
    doc.text(`Status: ${parcel.status}`);
    doc.moveDown();

    // -- Merchant ------------------------------------------------
    doc.fontSize(12).text("Merchant", { underline: true });
    doc.fontSize(10);
    doc.text(`Name: ${parcel.merchant.name}`);
    if (parcel.merchant.businessName) {
        doc.text(`Business: ${parcel.merchant.businessName}`);
    }
    doc.text(`Email: ${parcel.merchant.email}`);
    doc.text(`Phone: ${parcel.merchant.phone}`);
    doc.moveDown();

    // -- Pickup --------------------------------------------------
    doc.fontSize(12).text("Pickup", { underline: true });
    doc.fontSize(10);
    doc.text(
        `Contact: ${parcel.pickupContactName} (${parcel.pickupContactPhone})`,
    );
    doc.text(`Address: ${parcel.pickupAddressLine}`);
    doc.text(`District / City: ${parcel.pickupDistrict}, ${parcel.pickupCity}`);
    doc.text(`Pickup Mode: ${parcel.pickupMode}`);
    doc.moveDown();

    // -- Delivery ------------------------------------------------
    doc.fontSize(12).text("Delivery", { underline: true });
    doc.fontSize(10);
    doc.text(`Recipient: ${parcel.recipientName} (${parcel.recipientPhone})`);
    doc.text(`Email: ${parcel.recipientEmail}`);
    doc.text(`Address: ${parcel.deliveryAddressLine}`);
    doc.text(
        `District / City: ${parcel.deliveryDistrict}, ${parcel.deliveryCity}`,
    );
    doc.text(`Zone: ${parcel.deliveryZoneType}`);
    doc.text(`Delivery Type: ${parcel.deliveryType}`);
    doc.moveDown();

    // -- Shipment ------------------------------------------------
    doc.fontSize(12).text("Shipment", { underline: true });
    doc.fontSize(10);
    doc.text(`Category: ${parcel.parcelCategory}`);
    doc.text(`Item: ${parcel.itemDescription}`);
    doc.text(`Quantity: ${parcel.itemQuantity}`);
    doc.text(`Weight: ${Number(parcel.weightKg).toFixed(2)} kg`);
    doc.text(`Declared Value: ${money(parcel.declaredValue, currency)}`);
    doc.moveDown();

    // -- Charges -------------------------------------------------
    doc.fontSize(12).text("Charges", { underline: true });
    doc.fontSize(10);
    doc.text(`Base Charge: ${money(parcel.baseCharge, currency)}`);
    doc.text(`Weight Charge: ${money(parcel.weightCharge, currency)}`);
    doc.text(
        `Delivery Surcharge: ${money(parcel.deliveryTypeSurcharge, currency)}`,
    );
    doc.text(`Pickup Charge: ${money(parcel.pickupModeCharge, currency)}`);
    if (parcel.paymentType === PaymentType.COD) {
        doc.text(`COD Amount: ${money(parcel.codAmount, currency)}`);
        doc.text(`COD Fee: ${money(parcel.codFee, currency)}`);
    }
    doc.moveDown(0.3);
    doc.fontSize(12).text(
        `Total Charge: ${money(parcel.totalCharge, currency)}`,
        {
            align: "right",
        },
    );
    doc.moveDown();

    // -- Payment -------------------------------------------------
    doc.fontSize(12).text("Payment", { underline: true });
    doc.fontSize(10);
    doc.text(`Payment Type: ${parcel.paymentType}`);
    if (parcel.transaction) {
        doc.text(`Transaction Status: ${parcel.transaction.status}`);
        doc.text(
            `Transaction Amount: ${money(parcel.transaction.amount, currency)}`,
        );
        if (parcel.transaction.paidAt) {
            doc.text(`Paid At: ${parcel.transaction.paidAt}`);
        }
    }

    doc.end();
    const pdfBuffer = await pdfReadyPromise;

    return pdfBuffer;
};

const parcelStatusUpdateByAdmin = async (
    payload: IParcelStatusUpdateByAdminPayload,
    parcelId: string,
) => {
    const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
    });

    if (!parcel) {
        throw new AppError(httpStatus.NOT_FOUND, "Parcel not found");
    }

    if (parcel.isDeleted) {
        throw new AppError(httpStatus.GONE, "Parcel has been deleted");
    }

    // Reject any status the admin endpoint doesn't allow (defensive — even if
    // the route's validateRequest is bypassed).
    const allowedFrom = ADMIN_STATUS_TRANSITIONS[payload.status];
    if (!allowedFrom) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            `Admins can only set status to: ${Object.keys(ADMIN_STATUS_TRANSITIONS).join(", ")}`,
        );
    }

    // Enforce the state machine: only legal current -> next transitions.
    if (
        parcel.status !== payload.status &&
        !allowedFrom.includes(parcel.status)
    ) {
        throw new AppError(
            httpStatus.CONFLICT,
            `Cannot change status from ${parcel.status} to ${payload.status}`,
        );
    }

    const updatedParcel = await prisma.parcel.update({
        where: { id: parcelId },
        data: { status: payload.status },
    });

    return updatedParcel;
};

export const ParcelService = {
    createParcel,
    initiateParcelPayment,
    paymentCallback,
    cancelParcel,
    cancelParcelByAdmin,
    getMyParcels,
    listParcels,
    getSingleParcelAsAdmin,
    getSingleParcelAsMerchant,
    trackParcel,
    deleteParcel,
    downloadParcelInvoice,
    parcelStatusUpdateByAdmin,
};
