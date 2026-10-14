CREATE TYPE "DiagnosticRepairHandoffType" AS ENUM ('PUBLISH_DIAGNOSIS', 'REPAIR_RECOMMENDATION', 'ESTIMATE_AUTHORIZATION', 'DISPATCH_REQUIREMENTS', 'PARTS_READINESS');
CREATE TYPE "DiagnosticRepairHandoffStatus" AS ENUM ('READY_FOR_REVIEW', 'PUBLISHED', 'BLOCKED');

CREATE TABLE "DiagnosticRepairHandoffVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL,
  "concernVersionId" TEXT NOT NULL, "conclusionVersionId" TEXT NOT NULL, "repairDiagnosisVersionId" TEXT,
  "version" INTEGER NOT NULL, "handoffType" "DiagnosticRepairHandoffType" NOT NULL, "status" "DiagnosticRepairHandoffStatus" NOT NULL,
  "recommendation" TEXT NOT NULL, "proposedCorrection" TEXT NOT NULL, "operations" JSONB NOT NULL,
  "estimateBoundary" JSONB NOT NULL, "dispatchBoundary" JSONB NOT NULL, "partsBoundary" JSONB NOT NULL, "sourceVersions" JSONB NOT NULL,
  "policyVersion" TEXT NOT NULL, "conclusionChecksum" TEXT NOT NULL, "handoffChecksum" TEXT NOT NULL, "controlDecisionChecksum" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL, "supersedesId" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticRepairHandoffVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticRepairHandoff_identity_check" CHECK ("version" > 0 AND BTRIM("policyVersion") <> '' AND LENGTH(BTRIM("recommendation")) >= 10 AND LENGTH(BTRIM("proposedCorrection")) >= 10),
  CONSTRAINT "DiagnosticRepairHandoff_checksum_check" CHECK ("conclusionChecksum" ~ '^[0-9a-f]{64}$' AND "handoffChecksum" ~ '^[0-9a-f]{64}$' AND "controlDecisionChecksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticRepairHandoff_publish_check" CHECK (("handoffType" = 'PUBLISH_DIAGNOSIS' AND "status" = 'PUBLISHED' AND "repairDiagnosisVersionId" IS NOT NULL) OR ("handoffType" <> 'PUBLISH_DIAGNOSIS')),
  CONSTRAINT "DiagnosticRepairHandoff_supersedes_check" CHECK ("supersedesId" IS NULL OR "supersedesId" <> "id")
);

CREATE UNIQUE INDEX "DiagnosticRepairHandoff_case_version_key" ON "DiagnosticRepairHandoffVersion"("diagnosticCaseId", "version");
CREATE UNIQUE INDEX "DiagnosticRepairHandoff_id_org_key" ON "DiagnosticRepairHandoffVersion"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticRepairHandoff_supersedes_key" ON "DiagnosticRepairHandoffVersion"("supersedesId");
CREATE INDEX "DiagnosticRepairHandoff_org_ro_time_idx" ON "DiagnosticRepairHandoffVersion"("organizationId", "repairOrderId", "occurredAt");
CREATE INDEX "DiagnosticRepairHandoff_org_type_status_time_idx" ON "DiagnosticRepairHandoffVersion"("organizationId", "handoffType", "status", "occurredAt");
CREATE INDEX "DiagnosticRepairHandoff_repair_diagnosis_idx" ON "DiagnosticRepairHandoffVersion"("repairDiagnosisVersionId");

ALTER TABLE "DiagnosticRepairHandoffVersion" ADD CONSTRAINT "DiagnosticRepairHandoff_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRepairHandoffVersion" ADD CONSTRAINT "DiagnosticRepairHandoff_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRepairHandoffVersion" ADD CONSTRAINT "DiagnosticRepairHandoff_repair_order_tenant_fkey" FOREIGN KEY ("repairOrderId", "organizationId") REFERENCES "RepairOrder"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRepairHandoffVersion" ADD CONSTRAINT "DiagnosticRepairHandoff_concern_tenant_fkey" FOREIGN KEY ("concernVersionId", "organizationId") REFERENCES "DiagnosticConcernVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRepairHandoffVersion" ADD CONSTRAINT "DiagnosticRepairHandoff_conclusion_tenant_fkey" FOREIGN KEY ("conclusionVersionId", "organizationId") REFERENCES "DiagnosticConclusionVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRepairHandoffVersion" ADD CONSTRAINT "DiagnosticRepairHandoff_diagnosis_fkey" FOREIGN KEY ("repairDiagnosisVersionId") REFERENCES "RepairDiagnosisVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRepairHandoffVersion" ADD CONSTRAINT "DiagnosticRepairHandoff_author_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRepairHandoffVersion" ADD CONSTRAINT "DiagnosticRepairHandoff_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticRepairHandoffVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_repair_handoff_lineage() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticCase" WHERE "id" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId" AND "repairOrderId" = NEW."repairOrderId") THEN RAISE EXCEPTION 'repair handoff case and repair order must share tenant and source record'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticConclusionVersion" WHERE "id" = NEW."conclusionVersionId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "concernVersionId" = NEW."concernVersionId" AND "status" = 'CONFIRMED' AND "conclusionChecksum" = NEW."conclusionChecksum") THEN RAISE EXCEPTION 'repair handoff must bind to a confirmed conclusion with the exact checksum'; END IF;
  IF NEW."repairDiagnosisVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "RepairDiagnosisVersion" WHERE "id" = NEW."repairDiagnosisVersionId" AND "organizationId" = NEW."organizationId" AND "repairOrderId" = NEW."repairOrderId") THEN RAISE EXCEPTION 'repair diagnosis publication must stay within the same tenant and repair order'; END IF;
  IF NEW."supersedesId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DiagnosticRepairHandoffVersion" WHERE "id" = NEW."supersedesId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'repair handoff lineage must remain within one tenant and case'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticRepairHandoff_validate" BEFORE INSERT ON "DiagnosticRepairHandoffVersion" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_repair_handoff_lineage();
CREATE TRIGGER "DiagnosticRepairHandoff_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticRepairHandoffVersion" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
