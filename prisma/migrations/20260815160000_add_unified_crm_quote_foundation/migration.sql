CREATE TYPE "UnifiedCrmQuoteState" AS ENUM ('DRAFT', 'PRESENTED', 'ARCHIVED');

CREATE TYPE "UnifiedCrmQuoteVersionState" AS ENUM ('DRAFT', 'PRESENTED', 'SUPERSEDED');

CREATE TABLE "UnifiedCrmQuoteRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "opportunityId" TEXT,
    "customerId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "latestVersionNumber" INTEGER NOT NULL DEFAULT 0,
    "state" "UnifiedCrmQuoteState" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priceSource" TEXT NOT NULL,
    "termsSnapshot" JSONB NOT NULL,
    "latestDraftSnapshot" JSONB NOT NULL,
    "presentedVersionId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedCrmQuoteRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnifiedCrmQuoteVersion" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "state" "UnifiedCrmQuoteVersionState" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL,
    "priceSource" TEXT NOT NULL,
    "termsSnapshot" JSONB NOT NULL,
    "totalsSnapshot" JSONB NOT NULL,
    "lineItemsSnapshot" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "presentedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedCrmQuoteVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnifiedCrmQuoteRecord_organizationId_quoteNumber_key"
ON "UnifiedCrmQuoteRecord"("organizationId", "quoteNumber");

CREATE UNIQUE INDEX "UnifiedCrmQuoteRecord_presentedVersionId_key"
ON "UnifiedCrmQuoteRecord"("presentedVersionId");

CREATE UNIQUE INDEX "UnifiedCrmQuoteVersion_quoteId_versionNumber_key"
ON "UnifiedCrmQuoteVersion"("quoteId", "versionNumber");

CREATE INDEX "UnifiedCrmQuoteRecord_organizationId_state_updatedAt_idx"
ON "UnifiedCrmQuoteRecord"("organizationId", "state", "updatedAt");

CREATE INDEX "UnifiedCrmQuoteRecord_organizationId_opportunityId_updatedAt_idx"
ON "UnifiedCrmQuoteRecord"("organizationId", "opportunityId", "updatedAt");

CREATE INDEX "UnifiedCrmQuoteRecord_customerId_updatedAt_idx"
ON "UnifiedCrmQuoteRecord"("customerId", "updatedAt");

CREATE INDEX "UnifiedCrmQuoteVersion_organizationId_state_createdAt_idx"
ON "UnifiedCrmQuoteVersion"("organizationId", "state", "createdAt");

ALTER TABLE "UnifiedCrmQuoteRecord"
ADD CONSTRAINT "UnifiedCrmQuoteRecord_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmQuoteRecord"
ADD CONSTRAINT "UnifiedCrmQuoteRecord_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "UnifiedCrmOpportunityRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmQuoteRecord"
ADD CONSTRAINT "UnifiedCrmQuoteRecord_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmQuoteRecord"
ADD CONSTRAINT "UnifiedCrmQuoteRecord_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmQuoteRecord"
ADD CONSTRAINT "UnifiedCrmQuoteRecord_presentedVersionId_fkey"
FOREIGN KEY ("presentedVersionId") REFERENCES "UnifiedCrmQuoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmQuoteVersion"
ADD CONSTRAINT "UnifiedCrmQuoteVersion_quoteId_fkey"
FOREIGN KEY ("quoteId") REFERENCES "UnifiedCrmQuoteRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmQuoteVersion"
ADD CONSTRAINT "UnifiedCrmQuoteVersion_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmQuoteVersion"
ADD CONSTRAINT "UnifiedCrmQuoteVersion_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
