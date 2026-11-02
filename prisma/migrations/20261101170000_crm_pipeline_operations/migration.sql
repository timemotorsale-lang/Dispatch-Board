CREATE UNIQUE INDEX "UnifiedCrmOpportunityRecord_id_organizationId_key" ON "UnifiedCrmOpportunityRecord"("id", "organizationId");
CREATE TABLE "CrmPipelineState" (
  "opportunityId" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL,
  "pathway" TEXT NOT NULL DEFAULT 'retail-sale', "temperature" TEXT NOT NULL DEFAULT 'WARM',
  "disposition" TEXT NOT NULL DEFAULT 'ACTIVE', "reviewAt" TIMESTAMP(3),
  "pushCount" INTEGER NOT NULL DEFAULT 0, "pendingOwnerId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
  "handoffDueAt" TIMESTAMP(3), "dealId" TEXT UNIQUE REFERENCES "DealDeskDraft"("id") ON DELETE RESTRICT,
  "metadata" JSONB NOT NULL DEFAULT '{}', "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("opportunityId", "organizationId") REFERENCES "UnifiedCrmOpportunityRecord"("id", "organizationId") ON DELETE RESTRICT,
  CHECK ("disposition" IN ('ACTIVE','WAITING','NURTURE','DO_NOT_CONTACT','ARCHIVED')),
  CHECK ("temperature" IN ('HOT','WARM','COLD'))
);
CREATE INDEX "CrmPipelineState_organizationId_disposition_reviewAt_idx" ON "CrmPipelineState"("organizationId", "disposition", "reviewAt");
CREATE UNIQUE INDEX "CrmPipelineState_opportunityId_organizationId_key" ON "CrmPipelineState"("opportunityId", "organizationId");
CREATE TABLE "CrmPipelineReceipt" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "opportunityId" TEXT NOT NULL,
  "sourceCode" TEXT NOT NULL, "sourceKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("opportunityId", "organizationId") REFERENCES "UnifiedCrmOpportunityRecord"("id", "organizationId") ON DELETE RESTRICT,
  UNIQUE ("organizationId", "sourceCode", "sourceKey")
);
CREATE INDEX "CrmPipelineReceipt_organizationId_receivedAt_idx" ON "CrmPipelineReceipt"("organizationId", "receivedAt");
CREATE TABLE "CrmPipelineException" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "opportunityId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "state" TEXT NOT NULL DEFAULT 'OPEN', "reason" TEXT NOT NULL,
  "ownerUserId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT, "queue" TEXT NOT NULL DEFAULT 'Intake manager',
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewDueAt" TIMESTAMP(3) NOT NULL, "resolvedAt" TIMESTAMP(3), "resolution" TEXT,
  FOREIGN KEY ("opportunityId", "organizationId") REFERENCES "UnifiedCrmOpportunityRecord"("id", "organizationId") ON DELETE RESTRICT,
  UNIQUE ("opportunityId", "code"), CHECK ("state" IN ('OPEN','RESOLVED'))
);
CREATE INDEX "CrmPipelineException_organizationId_state_reviewDueAt_idx" ON "CrmPipelineException"("organizationId", "state", "reviewDueAt");
CREATE TABLE "CrmPipelineEnrollment" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "opportunityId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "templateVersion" INTEGER NOT NULL DEFAULT 1, "steps" JSONB NOT NULL,
  "step" INTEGER NOT NULL DEFAULT 0, "state" TEXT NOT NULL DEFAULT 'ACTIVE',
  "activeKey" TEXT UNIQUE, "nextRunAt" TIMESTAMP(3), "reason" TEXT, "taskId" TEXT REFERENCES "Task"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("opportunityId", "organizationId") REFERENCES "UnifiedCrmOpportunityRecord"("id", "organizationId") ON DELETE RESTRICT,
  CHECK ("state" IN ('ACTIVE','PAUSED','COMPLETED','STOPPED','FAILED'))
);
CREATE INDEX "CrmPipelineEnrollment_organizationId_state_nextRunAt_idx" ON "CrmPipelineEnrollment"("organizationId", "state", "nextRunAt");
