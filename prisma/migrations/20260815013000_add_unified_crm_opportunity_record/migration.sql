CREATE TABLE "UnifiedCrmOpportunityRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "opportunityNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "customerId" TEXT,
    "ownerUserId" TEXT,
    "sourceLeadId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedCrmOpportunityRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnifiedCrmOpportunityRecord_organizationId_opportunityNumber_key"
ON "UnifiedCrmOpportunityRecord"("organizationId", "opportunityNumber");

CREATE INDEX "UnifiedCrmOpportunityRecord_organizationId_ownerUserId_updatedAt_idx"
ON "UnifiedCrmOpportunityRecord"("organizationId", "ownerUserId", "updatedAt");

CREATE INDEX "UnifiedCrmOpportunityRecord_customerId_updatedAt_idx"
ON "UnifiedCrmOpportunityRecord"("customerId", "updatedAt");

CREATE INDEX "UnifiedCrmOpportunityRecord_sourceLeadId_idx"
ON "UnifiedCrmOpportunityRecord"("sourceLeadId");

ALTER TABLE "UnifiedCrmOpportunityRecord"
ADD CONSTRAINT "UnifiedCrmOpportunityRecord_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityRecord"
ADD CONSTRAINT "UnifiedCrmOpportunityRecord_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityRecord"
ADD CONSTRAINT "UnifiedCrmOpportunityRecord_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityRecord"
ADD CONSTRAINT "UnifiedCrmOpportunityRecord_sourceLeadId_fkey"
FOREIGN KEY ("sourceLeadId") REFERENCES "CustomerLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
