/*
  Warnings:

  - Made the column `assignedById` on table `assignments` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_assignedById_fkey";

-- AlterTable
ALTER TABLE "assignments" ALTER COLUMN "assignedById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
