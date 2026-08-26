CREATE TYPE "UnifiedCrmForecastSource" AS ENUM ('BASELINE', 'SELLER_JUDGMENT', 'MANAGER_JUDGMENT');

CREATE TYPE "UnifiedCrmForecastCategory" AS ENUM ('WATCH', 'PIPELINE', 'BEST_CASE', 'COMMIT', 'CLOSED');

CREATE TABLE "UnifiedCrmForecastSnapshot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "source" "UnifiedCrmForecastSource" NOT NULL,
  "category" "UnifiedCrmForecastCategory" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "probabilityBasisPts" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "inputSnapshot" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UnifiedCrmForecastSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UnifiedCrmForecastSnapshot_amountCents_check" CHECK ("amountCents" >= 0),
  CONSTRAINT "UnifiedCrmForecastSnapshot_probabilityBasisPts_check" CHECK ("probabilityBasisPts" >= 0 AND "probabilityBasisPts" <= 10000)
);

CREATE INDEX "UnifiedCrmForecastSnapshot_organizationId_opportunityId_createdAt_idx"
  ON "UnifiedCrmForecastSnapshot"("organizationId", "opportunityId", "createdAt");

CREATE INDEX "UnifiedCrmForecastSnapshot_organizationId_source_createdAt_idx"
  ON "UnifiedCrmForecastSnapshot"("organizationId", "source", "createdAt");

CREATE INDEX "UnifiedCrmForecastSnapshot_createdByUserId_createdAt_idx"
  ON "UnifiedCrmForecastSnapshot"("createdByUserId", "createdAt");

ALTER TABLE "UnifiedCrmForecastSnapshot"
  ADD CONSTRAINT "UnifiedCrmForecastSnapshot_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmForecastSnapshot"
  ADD CONSTRAINT "UnifiedCrmForecastSnapshot_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "UnifiedCrmOpportunityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmForecastSnapshot"
  ADD CONSTRAINT "UnifiedCrmForecastSnapshot_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
