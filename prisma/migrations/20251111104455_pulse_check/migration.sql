/*
  Warnings:

  - A unique constraint covering the columns `[surveyId,language]` on the table `ActionCache` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[type,userId,surveyId,language]` on the table `Insight` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ActionCache_surveyId_key";

-- DropIndex
DROP INDEX "Insight_type_userId_surveyId_key";

-- AlterTable
ALTER TABLE "ActionCache" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'nl';

-- AlterTable
ALTER TABLE "Insight" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'nl';

-- CreateIndex
CREATE UNIQUE INDEX "ActionCache_surveyId_language_key" ON "ActionCache"("surveyId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Insight_type_userId_surveyId_language_key" ON "Insight"("type", "userId", "surveyId", "language");
