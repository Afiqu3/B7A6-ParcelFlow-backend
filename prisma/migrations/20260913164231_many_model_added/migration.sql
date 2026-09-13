-- CreateEnum
CREATE TYPE "PickupMode" AS ENUM ('RIDER_PICKUP', 'MERCHANT_DROP');

-- CreateEnum
CREATE TYPE "ParcelCategory" AS ENUM ('DOCUMENT', 'PARCEL');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('INSIDE_CITY', 'SUB_CITY', 'OUTSIDE_CITY');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('REGULAR', 'EXPRESS', 'SAME_DAY');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PREPAID', 'COD');

-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('CREATED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'AT_HUB', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED_TO_MERCHANT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AssignmentLeg" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "leg" "AssignmentLeg" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parcelId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "assignedById" TEXT,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcels" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "pickupContactName" TEXT NOT NULL,
    "pickupContactPhone" TEXT NOT NULL,
    "pickupAddressLine" TEXT NOT NULL,
    "pickupMode" "PickupMode" NOT NULL DEFAULT 'RIDER_PICKUP',
    "pickupDistrict" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "note" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "deliveryAddressLine" TEXT NOT NULL,
    "deliveryDistrict" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "parcelCategory" "ParcelCategory" NOT NULL,
    "weightKg" DECIMAL(10,2) NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "itemQuantity" INTEGER NOT NULL DEFAULT 1,
    "declaredValue" DECIMAL(12,2),
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'REGULAR',
    "paymentType" "PaymentType" NOT NULL,
    "codAmount" DECIMAL(12,2),
    "deliveryZoneType" "ZoneType" NOT NULL,
    "baseCharge" DECIMAL(12,2) NOT NULL,
    "weightCharge" DECIMAL(12,2) NOT NULL,
    "deliveryTypeSurcharge" DECIMAL(12,2) NOT NULL,
    "pickupModeCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "codFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCharge" DECIMAL(12,2) NOT NULL,
    "status" "ParcelStatus" NOT NULL DEFAULT 'CREATED',
    "reattemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxReattempts" INTEGER NOT NULL DEFAULT 3,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "failureReason" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "merchantId" TEXT NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneType" "ZoneType" NOT NULL,
    "parcelCategory" "ParcelCategory" NOT NULL,
    "baseWeightKg" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "baseCharge" DECIMAL(12,2) NOT NULL,
    "perKgCharge" DECIMAL(12,2) NOT NULL,
    "expressSurcharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sameDaySurcharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "riderPickupCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "codFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "bookingPayload" JSONB,
    "paymentGateway" TEXT NOT NULL DEFAULT 'bkash',
    "merchantInvoiceNumber" TEXT NOT NULL,
    "bkashPaymentID" TEXT,
    "bkashTrxID" TEXT,
    "bkashStatus" TEXT,
    "payerReference" TEXT,
    "paidAt" TEXT,
    "bkashResponse" JSONB,
    "refundedAmount" DECIMAL(12,2),
    "refundedAt" TEXT,
    "refundReason" TEXT,
    "refundTxID" TEXT,
    "expiresAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "merchantId" TEXT NOT NULL,
    "parcelId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignments_parcelId_leg_idx" ON "assignments"("parcelId", "leg");

-- CreateIndex
CREATE INDEX "assignments_riderId_status_idx" ON "assignments"("riderId", "status");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "parcels_trackingId_key" ON "parcels"("trackingId");

-- CreateIndex
CREATE INDEX "parcels_merchantId_status_idx" ON "parcels"("merchantId", "status");

-- CreateIndex
CREATE INDEX "parcels_status_idx" ON "parcels"("status");

-- CreateIndex
CREATE INDEX "parcels_deliveryDistrict_idx" ON "parcels"("deliveryDistrict");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_name_key" ON "pricing_rules"("name");

-- CreateIndex
CREATE INDEX "pricing_rules_zoneType_parcelCategory_isActive_idx" ON "pricing_rules"("zoneType", "parcelCategory", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_zoneType_parcelCategory_key" ON "pricing_rules"("zoneType", "parcelCategory");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_merchantInvoiceNumber_key" ON "transactions"("merchantInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_bkashPaymentID_key" ON "transactions"("bkashPaymentID");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_parcelId_key" ON "transactions"("parcelId");

-- CreateIndex
CREATE INDEX "transactions_merchantId_status_idx" ON "transactions"("merchantId", "status");

-- CreateIndex
CREATE INDEX "transactions_status_expiresAt_idx" ON "transactions"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riderProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
