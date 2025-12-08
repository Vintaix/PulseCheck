-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('EMPLOYEE', 'TEAM', 'COMPANY');

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "userId" TEXT,
    "surveyId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionCache" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "actionsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insight_surveyId_idx" ON "Insight"("surveyId");

-- CreateIndex
CREATE INDEX "Insight_userId_idx" ON "Insight"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Insight_type_userId_surveyId_key" ON "Insight"("type", "userId", "surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionCache_surveyId_key" ON "ActionCache"("surveyId");

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionCache" ADD CONSTRAINT "ActionCache_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
