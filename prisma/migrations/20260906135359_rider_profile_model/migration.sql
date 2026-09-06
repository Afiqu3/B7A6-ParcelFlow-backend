-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BIKE', 'BICYCLE', 'VAN');

-- CreateEnum
CREATE TYPE "RiderApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "riderProfiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "nid" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "vehiclePaper" TEXT,
    "vehiclePaperPublicId" TEXT,
    "applicationStatus" "RiderApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "riderProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "riderProfiles_email_key" ON "riderProfiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "riderProfiles_nid_key" ON "riderProfiles"("nid");

-- CreateIndex
CREATE UNIQUE INDEX "riderProfiles_licenseNumber_key" ON "riderProfiles"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "riderProfiles_userId_key" ON "riderProfiles"("userId");

-- CreateIndex
CREATE INDEX "idx_rider_email" ON "riderProfiles"("email");

-- CreateIndex
CREATE INDEX "idx_rider_applicationStatus" ON "riderProfiles"("applicationStatus");

-- AddForeignKey
ALTER TABLE "riderProfiles" ADD CONSTRAINT "riderProfiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
