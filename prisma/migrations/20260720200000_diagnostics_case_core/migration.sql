CREATE TYPE "DiagnosticCaseStatus" AS ENUM (
  'DRAFT', 'TRIAGE', 'TEST_PLAN_READY', 'TESTING', 'CAUSE_PROPOSED',
  'CONFIRMATION_REQUIRED', 'CONFIRMED', 'REPAIR_PLANNING', 'HANDED_OFF',
  'POST_REPAIR_VERIFICATION', 'VERIFIED_CLOSED', 'WAITING_FOR_VEHICLE',
  'WAITING_FOR_AUTHORIZATION', 'WAITING_FOR_TOOL', 'WAITING_FOR_INFORMATION',
  'WAITING_FOR_PART', 'ESCALATED', 'INCONCLUSIVE', 'NO_FAULT_FOUND',
  'ABANDONED', 'REOPENED'
);

CREATE TYPE "DiagnosticRiskTier" AS ENUM ('R0', 'R1', 'R2', 'R3', 'R4');
CREATE TYPE "DiagnosticCaseEventType" AS ENUM ('CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'ESCALATED', 'REOPENED', 'ABANDONED');

CREATE TABLE "DiagnosticCase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "concernKey" TEXT NOT NULL,
  "concernFingerprint" TEXT NOT NULL,
  "status" "DiagnosticCaseStatus" NOT NULL DEFAULT 'DRAFT',
  "riskTier" "DiagnosticRiskTier" NOT NULL DEFAULT 'R1',
  "assignedUserId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "currentConcernVersion" INTEGER NOT NULL DEFAULT 1,
  "resumeStatus" "DiagnosticCaseStatus",
  "version" INTEGER NOT NULL DEFAULT 1,
  "openedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiagnosticCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticConcernVersion" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "diagnosticCaseId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "statement" TEXT NOT NULL,
  "operatingConditions" JSONB NOT NULL,
  "source" TEXT NOT NULL,
  "sourceSnapshot" JSONB NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticConcernVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticCaseStateEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "diagnosticCaseId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "eventType" "DiagnosticCaseEventType" NOT NULL,
  "fromStatus" "DiagnosticCaseStatus",
  "toStatus" "DiagnosticCaseStatus" NOT NULL,
  "fromAssignedUserId" TEXT,
  "toAssignedUserId" TEXT,
  "reasonCode" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticCaseStateEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiagnosticCase_id_organizationId_key" ON "DiagnosticCase"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticCase_repairOrderId_concernKey_key" ON "DiagnosticCase"("repairOrderId", "concernKey");
CREATE INDEX "DiagnosticCase_repairOrderId_concernFingerprint_idx" ON "DiagnosticCase"("repairOrderId", "concernFingerprint");
CREATE INDEX "DiagnosticCase_organizationId_locationId_status_updatedAt_idx" ON "DiagnosticCase"("organizationId", "locationId", "status", "updatedAt");
CREATE INDEX "DiagnosticCase_organizationId_assignedUserId_status_updatedAt_idx" ON "DiagnosticCase"("organizationId", "assignedUserId", "status", "updatedAt");
CREATE INDEX "DiagnosticCase_vehicleId_status_idx" ON "DiagnosticCase"("vehicleId", "status");

CREATE UNIQUE INDEX "DiagnosticConcernVersion_supersedesId_key" ON "DiagnosticConcernVersion"("supersedesId");
CREATE UNIQUE INDEX "DiagnosticConcernVersion_diagnosticCaseId_version_key" ON "DiagnosticConcernVersion"("diagnosticCaseId", "version");
CREATE INDEX "DiagnosticConcernVersion_organizationId_createdAt_idx" ON "DiagnosticConcernVersion"("organizationId", "createdAt");

CREATE UNIQUE INDEX "DiagnosticCaseStateEvent_diagnosticCaseId_version_key" ON "DiagnosticCaseStateEvent"("diagnosticCaseId", "version");
CREATE INDEX "DiagnosticCaseStateEvent_organizationId_occurredAt_idx" ON "DiagnosticCaseStateEvent"("organizationId", "occurredAt");
CREATE INDEX "DiagnosticCaseStateEvent_correlationId_idx" ON "DiagnosticCaseStateEvent"("correlationId");
CREATE INDEX "DiagnosticCaseStateEvent_toAssignedUserId_occurredAt_idx" ON "DiagnosticCaseStateEvent"("toAssignedUserId", "occurredAt");

ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_required_text_check"
  CHECK (BTRIM("id") <> '' AND BTRIM("concernKey") <> '' AND BTRIM("concernFingerprint") <> '');
ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_version_check"
  CHECK ("version" > 0 AND "currentConcernVersion" > 0);
ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_closed_status_check"
  CHECK (("status" IN ('VERIFIED_CLOSED', 'INCONCLUSIVE', 'NO_FAULT_FOUND', 'ABANDONED')) = ("closedAt" IS NOT NULL));
ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_resume_status_check"
  CHECK ("status" NOT IN ('WAITING_FOR_VEHICLE', 'WAITING_FOR_AUTHORIZATION', 'WAITING_FOR_TOOL', 'WAITING_FOR_INFORMATION', 'WAITING_FOR_PART', 'ESCALATED', 'REOPENED') OR "resumeStatus" IS NOT NULL);
ALTER TABLE "DiagnosticConcernVersion" ADD CONSTRAINT "DiagnosticConcernVersion_content_check"
  CHECK ("version" > 0 AND BTRIM("statement") <> '' AND BTRIM("source") <> '');
ALTER TABLE "DiagnosticCaseStateEvent" ADD CONSTRAINT "DiagnosticCaseStateEvent_content_check"
  CHECK ("version" > 0 AND BTRIM("reasonCode") <> '' AND BTRIM("reason") <> '' AND BTRIM("correlationId") <> '');

ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_location_tenant_fkey"
  FOREIGN KEY ("locationId", "organizationId") REFERENCES "Location"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_vehicle_tenant_fkey"
  FOREIGN KEY ("vehicleId", "organizationId") REFERENCES "Vehicle"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_repair_order_tenant_fkey"
  FOREIGN KEY ("repairOrderId", "organizationId") REFERENCES "RepairOrder"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticCase" ADD CONSTRAINT "DiagnosticCase_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiagnosticConcernVersion" ADD CONSTRAINT "DiagnosticConcernVersion_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConcernVersion" ADD CONSTRAINT "DiagnosticConcernVersion_case_tenant_fkey"
  FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConcernVersion" ADD CONSTRAINT "DiagnosticConcernVersion_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConcernVersion" ADD CONSTRAINT "DiagnosticConcernVersion_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticConcernVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiagnosticCaseStateEvent" ADD CONSTRAINT "DiagnosticCaseStateEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticCaseStateEvent" ADD CONSTRAINT "DiagnosticCaseStateEvent_case_tenant_fkey"
  FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticCaseStateEvent" ADD CONSTRAINT "DiagnosticCaseStateEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_diagnostic_immutable_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticConcernVersion_immutable"
  BEFORE UPDATE OR DELETE ON "DiagnosticConcernVersion"
  FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();

CREATE TRIGGER "DiagnosticCaseStateEvent_immutable"
  BEFORE UPDATE OR DELETE ON "DiagnosticCaseStateEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();

INSERT INTO "VehicleOperationsFeatureFlag"
  ("id", "organizationId", "locationId", "code", "mode", "rolloutPercent", "allowedUserIds", "version", "updatedAt")
SELECT "id", "organizationId", "locationId", "code", "mode"::"VehicleOperationsRolloutMode", "rolloutPercent", "allowedUserIds", "version", "updatedAt"
FROM (VALUES
  ('diag-flag-master', 'org-time-motor-sales', NULL, 'DIAGNOSTICS_MASTER', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP),
  ('diag-flag-cases', 'org-time-motor-sales', NULL, 'DIAGNOSTIC_CASES', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP),
  ('diag-flag-evidence', 'org-time-motor-sales', NULL, 'DIAGNOSTIC_EVIDENCE', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP),
  ('diag-flag-reasoning', 'org-time-motor-sales', NULL, 'DIAGNOSTIC_REASONING', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP),
  ('diag-flag-publishing', 'org-time-motor-sales', NULL, 'DIAGNOSTIC_PUBLISHING', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP),
  ('diag-flag-knowledge', 'org-time-motor-sales', NULL, 'DIAGNOSTIC_KNOWLEDGE', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP),
  ('diag-flag-ai', 'org-time-motor-sales', NULL, 'DIAGNOSTIC_AI', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP)
) AS flags("id", "organizationId", "locationId", "code", "mode", "rolloutPercent", "allowedUserIds", "version", "updatedAt")
WHERE EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'org-time-motor-sales')
ON CONFLICT DO NOTHING;
