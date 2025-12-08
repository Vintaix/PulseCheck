-- CreateTable
CREATE TABLE "AIConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "questionPrompt" TEXT NOT NULL DEFAULT 'Je bent een HR expert die wekelijkse engagement vragen maakt voor een Vlaamse KMO. Genereer 3 vragen: 2 SCALE_1_5 vragen en 1 OPEN vraag. De vragen moeten relevant, kort en duidelijk zijn, en variëren per week.',
    "focusAreas" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'professioneel',
    "language" TEXT NOT NULL DEFAULT 'Nederlands',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIConfig_key_key" ON "AIConfig"("key");
