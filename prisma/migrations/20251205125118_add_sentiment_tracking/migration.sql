-- CreateTable
CREATE TABLE "WeeklySentiment" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklySentiment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySentiment_weekNumber_year_key" ON "WeeklySentiment"("weekNumber", "year");
