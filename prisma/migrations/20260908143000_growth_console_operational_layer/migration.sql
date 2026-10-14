CREATE TABLE "GrowthOpportunity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "opportunityType" TEXT NOT NULL,
  "ownerRole" TEXT NOT NULL,
  "priorityScore" INTEGER NOT NULL,
  "readiness" TEXT NOT NULL,
  "audienceLabel" TEXT NOT NULL,
  "estimatedValueCents" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL,
  "nextAction" TEXT NOT NULL,
  "sourceSummary" TEXT NOT NULL,
  "sourceSystems" JSONB NOT NULL,
  "sourceRecordRefs" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "dismissedAt" TIMESTAMP(3),
  "dismissedByUserId" TEXT,
  "dismissedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthCampaignPlan" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "opportunityId" TEXT,
  "opportunityTitle" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "campaignType" TEXT NOT NULL,
  "ownerRole" TEXT NOT NULL,
  "budgetCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "approvalRequestedAt" TIMESTAMP(3),
  "sourceRecordRefs" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdReason" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthCampaignPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthAudienceSnapshot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "campaignPlanId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "summary" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthAudienceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthAudienceSnapshotRow" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "audienceSnapshotId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "sourceRecordRefs" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthAudienceSnapshotRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthMessageDraft" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "campaignPlanId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "callToAction" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthMessageDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthApproval" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "campaignPlanId" TEXT NOT NULL,
  "approvalType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "requestedRole" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "decidedByUserId" TEXT,
  "decisionReason" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "GrowthApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthCampaignLedgerEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "campaignPlanId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "commandHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthCampaignLedgerEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthLaunchLock" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "campaignPlanId" TEXT NOT NULL,
  "lockedReason" TEXT NOT NULL,
  "nextAction" TEXT NOT NULL,
  "lockState" TEXT NOT NULL DEFAULT 'LOCKED',
  "actorUserId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthLaunchLock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthResultEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "campaignPlanId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceEventId" TEXT NOT NULL,
  "customerId" TEXT,
  "valueCents" INTEGER NOT NULL DEFAULT 0,
  "attributionTier" TEXT NOT NULL,
  "proofEvent" BOOLEAN NOT NULL DEFAULT false,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "recordedByUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthResultEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthCrmWritebackPreview" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "campaignPlanId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "targetSystem" TEXT NOT NULL,
  "customerId" TEXT,
  "valueCents" INTEGER NOT NULL DEFAULT 0,
  "locked" BOOLEAN NOT NULL DEFAULT true,
  "approvalNeeded" TEXT NOT NULL,
  "sourceEvidence" JSONB NOT NULL,
  "nextAction" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthCrmWritebackPreview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthOpportunity_organizationId_status_priorityScore_idx" ON "GrowthOpportunity"("organizationId", "status", "priorityScore");
CREATE INDEX "GrowthOpportunity_organizationId_ownerRole_status_idx" ON "GrowthOpportunity"("organizationId", "ownerRole", "status");
CREATE INDEX "GrowthOpportunity_organizationId_readiness_status_idx" ON "GrowthOpportunity"("organizationId", "readiness", "status");
CREATE INDEX "GrowthOpportunity_createdAt_idx" ON "GrowthOpportunity"("createdAt");

CREATE UNIQUE INDEX "GrowthCampaignPlan_organizationId_idempotencyKey_key" ON "GrowthCampaignPlan"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthCampaignPlan_organizationId_status_updatedAt_idx" ON "GrowthCampaignPlan"("organizationId", "status", "updatedAt");
CREATE INDEX "GrowthCampaignPlan_organizationId_ownerRole_status_idx" ON "GrowthCampaignPlan"("organizationId", "ownerRole", "status");
CREATE INDEX "GrowthCampaignPlan_opportunityId_idx" ON "GrowthCampaignPlan"("opportunityId");
CREATE INDEX "GrowthCampaignPlan_createdAt_idx" ON "GrowthCampaignPlan"("createdAt");

CREATE UNIQUE INDEX "GrowthAudienceSnapshot_campaignPlanId_version_key" ON "GrowthAudienceSnapshot"("campaignPlanId", "version");
CREATE UNIQUE INDEX "GrowthAudienceSnapshot_organizationId_idempotencyKey_key" ON "GrowthAudienceSnapshot"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthAudienceSnapshot_organizationId_campaignPlanId_createdAt_idx" ON "GrowthAudienceSnapshot"("organizationId", "campaignPlanId", "createdAt");

CREATE INDEX "GrowthAudienceSnapshotRow_organizationId_label_idx" ON "GrowthAudienceSnapshotRow"("organizationId", "label");
CREATE INDEX "GrowthAudienceSnapshotRow_audienceSnapshotId_idx" ON "GrowthAudienceSnapshotRow"("audienceSnapshotId");

CREATE UNIQUE INDEX "GrowthMessageDraft_campaignPlanId_version_key" ON "GrowthMessageDraft"("campaignPlanId", "version");
CREATE UNIQUE INDEX "GrowthMessageDraft_organizationId_idempotencyKey_key" ON "GrowthMessageDraft"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthMessageDraft_organizationId_campaignPlanId_createdAt_idx" ON "GrowthMessageDraft"("organizationId", "campaignPlanId", "createdAt");

CREATE UNIQUE INDEX "GrowthApproval_organizationId_idempotencyKey_key" ON "GrowthApproval"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthApproval_organizationId_status_requestedAt_idx" ON "GrowthApproval"("organizationId", "status", "requestedAt");
CREATE INDEX "GrowthApproval_campaignPlanId_status_idx" ON "GrowthApproval"("campaignPlanId", "status");
CREATE INDEX "GrowthApproval_requestedRole_status_idx" ON "GrowthApproval"("requestedRole", "status");

CREATE UNIQUE INDEX "GrowthCampaignLedgerEvent_organizationId_idempotencyKey_key" ON "GrowthCampaignLedgerEvent"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthCampaignLedgerEvent_organizationId_eventType_occurredAt_idx" ON "GrowthCampaignLedgerEvent"("organizationId", "eventType", "occurredAt");
CREATE INDEX "GrowthCampaignLedgerEvent_campaignPlanId_occurredAt_idx" ON "GrowthCampaignLedgerEvent"("campaignPlanId", "occurredAt");

CREATE UNIQUE INDEX "GrowthLaunchLock_organizationId_idempotencyKey_key" ON "GrowthLaunchLock"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthLaunchLock_organizationId_lockState_createdAt_idx" ON "GrowthLaunchLock"("organizationId", "lockState", "createdAt");
CREATE INDEX "GrowthLaunchLock_campaignPlanId_createdAt_idx" ON "GrowthLaunchLock"("campaignPlanId", "createdAt");

CREATE UNIQUE INDEX "GrowthResultEvent_organizationId_source_sourceEventId_key" ON "GrowthResultEvent"("organizationId", "source", "sourceEventId");
CREATE UNIQUE INDEX "GrowthResultEvent_organizationId_idempotencyKey_key" ON "GrowthResultEvent"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthResultEvent_organizationId_attributionTier_occurredAt_idx" ON "GrowthResultEvent"("organizationId", "attributionTier", "occurredAt");
CREATE INDEX "GrowthResultEvent_campaignPlanId_occurredAt_idx" ON "GrowthResultEvent"("campaignPlanId", "occurredAt");

CREATE UNIQUE INDEX "GrowthCrmWritebackPreview_organizationId_idempotencyKey_key" ON "GrowthCrmWritebackPreview"("organizationId", "idempotencyKey");
CREATE INDEX "GrowthCrmWritebackPreview_organizationId_targetSystem_locked_idx" ON "GrowthCrmWritebackPreview"("organizationId", "targetSystem", "locked");
CREATE INDEX "GrowthCrmWritebackPreview_campaignPlanId_createdAt_idx" ON "GrowthCrmWritebackPreview"("campaignPlanId", "createdAt");

ALTER TABLE "GrowthAudienceSnapshot" ADD CONSTRAINT "GrowthAudienceSnapshot_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "GrowthCampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthAudienceSnapshotRow" ADD CONSTRAINT "GrowthAudienceSnapshotRow_audienceSnapshotId_fkey" FOREIGN KEY ("audienceSnapshotId") REFERENCES "GrowthAudienceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthMessageDraft" ADD CONSTRAINT "GrowthMessageDraft_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "GrowthCampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthApproval" ADD CONSTRAINT "GrowthApproval_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "GrowthCampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthCampaignLedgerEvent" ADD CONSTRAINT "GrowthCampaignLedgerEvent_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "GrowthCampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthLaunchLock" ADD CONSTRAINT "GrowthLaunchLock_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "GrowthCampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthResultEvent" ADD CONSTRAINT "GrowthResultEvent_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "GrowthCampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthCrmWritebackPreview" ADD CONSTRAINT "GrowthCrmWritebackPreview_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "GrowthCampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
