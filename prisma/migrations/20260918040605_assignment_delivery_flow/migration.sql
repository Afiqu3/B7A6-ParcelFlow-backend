-- AlterEnum
ALTER TYPE "AssignmentStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "rejectedAt" TIMESTAMP(3);
