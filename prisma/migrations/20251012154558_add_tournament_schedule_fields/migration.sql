-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "days" INTEGER,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "estimatedRounds" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);
