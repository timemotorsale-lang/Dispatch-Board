CREATE TYPE "UnifiedCrmOpportunityStage" AS ENUM (
    'NEW_INQUIRY',
    'QUALIFIED',
    'APPOINTMENT_SET',
    'WORKING_DEAL',
    'QUOTE_PRESENTED',
    'CUSTOMER_DECIDING',
    'WON',
    'LOST'
);

ALTER TABLE "UnifiedCrmOpportunityRecord"
ADD COLUMN "stage" "UnifiedCrmOpportunityStage" NOT NULL DEFAULT 'NEW_INQUIRY',
ADD COLUMN "nextActionLabel" TEXT,
ADD COLUMN "nextActionDueAt" TIMESTAMP(3),
ADD COLUMN "estimatedValueCents" INTEGER,
ADD COLUMN "expectedCloseAt" TIMESTAMP(3),
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "createdReason" TEXT,
ADD COLUMN "wonEvidence" TEXT,
ADD COLUMN "lostReason" TEXT,
ADD COLUMN "handoffTarget" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "UnifiedCrmOpportunityRecord_organizationId_stage_nextActionDueAt_idx"
ON "UnifiedCrmOpportunityRecord"("organizationId", "stage", "nextActionDueAt");

ALTER TABLE "UnifiedCrmOpportunityRecord"
ADD CONSTRAINT "UnifiedCrmOpportunityRecord_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UnifiedCrmOpportunityStageEvent" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "fromStage" "UnifiedCrmOpportunityStage",
    "toStage" "UnifiedCrmOpportunityStage" NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "commandId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedCrmOpportunityStageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UnifiedCrmOpportunityStageEvent_opportunityId_occurredAt_idx"
ON "UnifiedCrmOpportunityStageEvent"("opportunityId", "occurredAt");

CREATE INDEX "UnifiedCrmOpportunityStageEvent_organizationId_toStage_occurredAt_idx"
ON "UnifiedCrmOpportunityStageEvent"("organizationId", "toStage", "occurredAt");

CREATE INDEX "UnifiedCrmOpportunityStageEvent_actorUserId_occurredAt_idx"
ON "UnifiedCrmOpportunityStageEvent"("actorUserId", "occurredAt");

ALTER TABLE "UnifiedCrmOpportunityStageEvent"
ADD CONSTRAINT "UnifiedCrmOpportunityStageEvent_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "UnifiedCrmOpportunityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityStageEvent"
ADD CONSTRAINT "UnifiedCrmOpportunityStageEvent_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityStageEvent"
ADD CONSTRAINT "UnifiedCrmOpportunityStageEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
