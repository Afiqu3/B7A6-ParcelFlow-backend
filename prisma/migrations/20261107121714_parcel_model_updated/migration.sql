/*
  Warnings:

  - You are about to drop the column `deliveryCity` on the `parcels` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryDistrict` on the `parcels` table. All the data in the column will be lost.
  - You are about to drop the column `pickupCity` on the `parcels` table. All the data in the column will be lost.
  - You are about to drop the column `pickupDistrict` on the `parcels` table. All the data in the column will be lost.
  - Made the column `deliveryCityId` on table `parcels` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pickupCityId` on table `parcels` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "parcels_deliveryDistrict_idx";

-- AlterTable
ALTER TABLE "parcels" DROP COLUMN "deliveryCity",
DROP COLUMN "deliveryDistrict",
DROP COLUMN "pickupCity",
DROP COLUMN "pickupDistrict",
ALTER COLUMN "deliveryCityId" SET NOT NULL,
ALTER COLUMN "pickupCityId" SET NOT NULL;
