/*
  Warnings:

  - The values [EXPIRED] on the enum `TransactionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `bookingPayload` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `failedAt` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `merchantId` on the `transactions` table. All the data in the column will be lost.
  - Made the column `parcelId` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionStatus_new" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "public"."transactions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "TransactionStatus_new" USING ("status"::text::"TransactionStatus_new");
ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";
DROP TYPE "public"."TransactionStatus_old";
ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_parcelId_fkey";

-- DropIndex
DROP INDEX "transactions_merchantId_status_idx";

-- DropIndex
DROP INDEX "transactions_status_expiresAt_idx";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "bookingPayload",
DROP COLUMN "expiresAt",
DROP COLUMN "failedAt",
DROP COLUMN "merchantId",
ALTER COLUMN "parcelId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
