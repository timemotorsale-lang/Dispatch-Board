CREATE TYPE "ShopReconLifecycleStage" AS ENUM (
  'SHOP_ENTRY', 'CUSTODY_CHECK_IN', 'LANE_SCOPE_CONFIRMATION', 'SAFETY_PRIORITY_TRIAGE',
  'INSPECTION', 'DIAGNOSIS', 'FINDINGS_VERIFICATION', 'REPAIR_PLAN_ESTIMATE',
  'AUTHORIZATION_APPROVAL', 'PARTS_RESOURCE_READINESS', 'READY_FOR_DISPATCH',
  'ASSIGNED_STAGED', 'REPAIR_EXECUTION', 'TECHNICIAN_COMPLETE',
  'QC_RELEASE_READINESS', 'HANDOFF_SHOP_EXIT'
);

CREATE TYPE "ShopReconLifecycleState" AS ENUM ('ACTIVE', 'WAITING', 'BLOCKED', 'PAUSED', 'REWORK', 'CANCELLED', 'CLOSED');

CREATE TYPE "ShopReconLifecycleEventType" AS ENUM (
  'INITIALIZED', 'DRAFT_SAVED', 'STAGE_COMPLETED', 'STAGE_MOVED', 'OVERRIDE_GRANTED',
  'SCOPE_CHANGE_SUBMITTED', 'SCOPE_CHANGE_RESOLVED', 'QC_FAILED_REWORK', 'QC_PASSED', 'RELEASED'
);

CREATE TABLE "ShopReconLifecycle" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "stage" "ShopReconLifecycleStage" NOT NULL,
  "operatingState" "ShopReconLifecycleState" NOT NULL DEFAULT 'ACTIVE',
  "stageStartedAt" TIMESTAMP(3) NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "zoneCode" TEXT NOT NULL,
  "targetAt" TIMESTAMP(3) NOT NULL,
  "nextAction" TEXT NOT NULL,
  "blockerCodes" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "scopeVersion" INTEGER NOT NULL DEFAULT 1,
  "lastSavedByUserId" TEXT,
  "lastSavedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopReconLifecycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopReconStageDraft" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "lifecycleId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "stage" "ShopReconLifecycleStage" NOT NULL,
  "scopeVersion" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL,
  "checklist" JSONB NOT NULL,
  "formData" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "savedByUserId" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  CONSTRAINT "ShopReconStageDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopReconLifecycleEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "lifecycleId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "eventType" "ShopReconLifecycleEventType" NOT NULL,
  "fromStage" "ShopReconLifecycleStage",
  "toStage" "ShopReconLifecycleStage",
  "fromOperatingState" "ShopReconLifecycleState",
  "toOperatingState" "ShopReconLifecycleState",
  "scopeVersion" INTEGER NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "overrideAuthorizedById" TEXT,
  "reason" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "correlationId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopReconLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopReconOverride" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "lifecycleId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "stage" "ShopReconLifecycleStage" NOT NULL,
  "kind" TEXT NOT NULL,
  "authorizedByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "boundaries" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "followUpAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopReconOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopReconScopeChange" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "lifecycleId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "discoveredAtStage" "ShopReconLifecycleStage" NOT NULL,
  "returnStage" "ShopReconLifecycleStage" NOT NULL,
  "finding" TEXT NOT NULL,
  "affectedRepairJobIds" JSONB NOT NULL,
  "originalScope" JSONB NOT NULL,
  "proposedScope" JSONB NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolutionReference" TEXT,
  CONSTRAINT "ShopReconScopeChange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopReconLifecycle_repairOrderId_key" ON "ShopReconLifecycle"("repairOrderId");
CREATE INDEX "ShopReconLifecycle_organizationId_stage_operatingState_targetAt_idx" ON "ShopReconLifecycle"("organizationId", "stage", "operatingState", "targetAt");
CREATE INDEX "ShopReconLifecycle_locationId_stage_operatingState_idx" ON "ShopReconLifecycle"("locationId", "stage", "operatingState");
CREATE INDEX "ShopReconLifecycle_ownerUserId_targetAt_idx" ON "ShopReconLifecycle"("ownerUserId", "targetAt");
CREATE UNIQUE INDEX "ShopReconStageDraft_lifecycleId_stage_scopeVersion_revision_key" ON "ShopReconStageDraft"("lifecycleId", "stage", "scopeVersion", "revision");
CREATE INDEX "ShopReconStageDraft_repairOrderId_stage_savedAt_idx" ON "ShopReconStageDraft"("repairOrderId", "stage", "savedAt");
CREATE INDEX "ShopReconStageDraft_savedByUserId_savedAt_idx" ON "ShopReconStageDraft"("savedByUserId", "savedAt");
CREATE UNIQUE INDEX "ShopReconLifecycleEvent_lifecycleId_sequence_key" ON "ShopReconLifecycleEvent"("lifecycleId", "sequence");
CREATE INDEX "ShopReconLifecycleEvent_repairOrderId_occurredAt_idx" ON "ShopReconLifecycleEvent"("repairOrderId", "occurredAt");
CREATE INDEX "ShopReconLifecycleEvent_actorUserId_occurredAt_idx" ON "ShopReconLifecycleEvent"("actorUserId", "occurredAt");
CREATE INDEX "ShopReconLifecycleEvent_correlationId_idx" ON "ShopReconLifecycleEvent"("correlationId");
CREATE INDEX "ShopReconOverride_repairOrderId_createdAt_idx" ON "ShopReconOverride"("repairOrderId", "createdAt");
CREATE INDEX "ShopReconOverride_authorizedByUserId_createdAt_idx" ON "ShopReconOverride"("authorizedByUserId", "createdAt");
CREATE UNIQUE INDEX "ShopReconScopeChange_lifecycleId_version_key" ON "ShopReconScopeChange"("lifecycleId", "version");
CREATE INDEX "ShopReconScopeChange_repairOrderId_status_submittedAt_idx" ON "ShopReconScopeChange"("repairOrderId", "status", "submittedAt");

ALTER TABLE "ShopReconLifecycle" ADD CONSTRAINT "ShopReconLifecycle_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopReconStageDraft" ADD CONSTRAINT "ShopReconStageDraft_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "ShopReconLifecycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopReconLifecycleEvent" ADD CONSTRAINT "ShopReconLifecycleEvent_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "ShopReconLifecycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopReconOverride" ADD CONSTRAINT "ShopReconOverride_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "ShopReconLifecycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopReconScopeChange" ADD CONSTRAINT "ShopReconScopeChange_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "ShopReconLifecycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
