CREATE TABLE "UnifiedCrmOpportunityTaskLink" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "briefSnapshot" TEXT NOT NULL,
  "dueAtSnapshot" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "commandId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UnifiedCrmOpportunityTaskLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnifiedCrmOpportunityTaskLink_opportunityId_taskId_key"
  ON "UnifiedCrmOpportunityTaskLink"("opportunityId", "taskId");

CREATE INDEX "UnifiedCrmOpportunityTaskLink_organizationId_createdAt_idx"
  ON "UnifiedCrmOpportunityTaskLink"("organizationId", "createdAt");

CREATE INDEX "UnifiedCrmOpportunityTaskLink_taskId_idx"
  ON "UnifiedCrmOpportunityTaskLink"("taskId");

CREATE INDEX "UnifiedCrmOpportunityTaskLink_createdByUserId_createdAt_idx"
  ON "UnifiedCrmOpportunityTaskLink"("createdByUserId", "createdAt");

ALTER TABLE "UnifiedCrmOpportunityTaskLink"
  ADD CONSTRAINT "UnifiedCrmOpportunityTaskLink_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "UnifiedCrmOpportunityRecord"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityTaskLink"
  ADD CONSTRAINT "UnifiedCrmOpportunityTaskLink_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityTaskLink"
  ADD CONSTRAINT "UnifiedCrmOpportunityTaskLink_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityTaskLink"
  ADD CONSTRAINT "UnifiedCrmOpportunityTaskLink_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
