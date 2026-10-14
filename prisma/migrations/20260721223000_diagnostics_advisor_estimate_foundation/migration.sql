CREATE TYPE "DiagnosticEstimateDraftStatus" AS ENUM ('DRAFTED', 'READY_FOR_ADVISOR_REVIEW', 'BLOCKED');

CREATE TABLE "DiagnosticEstimateDraftVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL,
  "concernVersionId" TEXT NOT NULL, "conclusionVersionId" TEXT NOT NULL, "repairHandoffVersionId" TEXT NOT NULL, "repairDiagnosisVersionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "status" "DiagnosticEstimateDraftStatus" NOT NULL, "selectedStrategy" TEXT NOT NULL,
  "advisorSummary" TEXT NOT NULL, "customerConcernSummary" TEXT NOT NULL, "customerCauseSummary" TEXT NOT NULL, "customerCorrectionSummary" TEXT NOT NULL,
  "assumptions" JSONB NOT NULL, "notIncluded" JSONB NOT NULL, "draftLines" JSONB NOT NULL, "totals" JSONB NOT NULL,
  "taxBoundary" TEXT NOT NULL, "estimateAuthorityBoundary" JSONB NOT NULL, "policyVersion" TEXT NOT NULL,
  "conclusionChecksum" TEXT NOT NULL, "repairHandoffChecksum" TEXT NOT NULL, "draftChecksum" TEXT NOT NULL, "controlDecisionChecksum" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL, "supersedesId" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticEstimateDraftVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticEstimateDraft_identity_check" CHECK ("version" > 0 AND BTRIM("policyVersion") <> '' AND LENGTH(BTRIM("advisorSummary")) >= 10 AND LENGTH(BTRIM("customerCauseSummary")) >= 10 AND LENGTH(BTRIM("customerCorrectionSummary")) >= 10),
  CONSTRAINT "DiagnosticEstimateDraft_checksum_check" CHECK ("conclusionChecksum" ~ '^[0-9a-f]{64}$' AND "repairHandoffChecksum" ~ '^[0-9a-f]{64}$' AND "draftChecksum" ~ '^[0-9a-f]{64}$' AND "controlDecisionChecksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticEstimateDraft_expiry_check" CHECK ("expiresAt" > "occurredAt"),
  CONSTRAINT "DiagnosticEstimateDraft_supersedes_check" CHECK ("supersedesId" IS NULL OR "supersedesId" <> "id")
);

CREATE UNIQUE INDEX "DiagnosticEstimateDraft_case_version_key" ON "DiagnosticEstimateDraftVersion"("diagnosticCaseId", "version");
CREATE UNIQUE INDEX "DiagnosticEstimateDraft_id_org_key" ON "DiagnosticEstimateDraftVersion"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticEstimateDraft_supersedes_key" ON "DiagnosticEstimateDraftVersion"("supersedesId");
CREATE INDEX "DiagnosticEstimateDraft_org_ro_time_idx" ON "DiagnosticEstimateDraftVersion"("organizationId", "repairOrderId", "occurredAt");
CREATE INDEX "DiagnosticEstimateDraft_org_status_time_idx" ON "DiagnosticEstimateDraftVersion"("organizationId", "status", "occurredAt");
CREATE INDEX "DiagnosticEstimateDraft_repair_diagnosis_idx" ON "DiagnosticEstimateDraftVersion"("repairDiagnosisVersionId");

ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_repair_order_tenant_fkey" FOREIGN KEY ("repairOrderId", "organizationId") REFERENCES "RepairOrder"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_concern_tenant_fkey" FOREIGN KEY ("concernVersionId", "organizationId") REFERENCES "DiagnosticConcernVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_conclusion_tenant_fkey" FOREIGN KEY ("conclusionVersionId", "organizationId") REFERENCES "DiagnosticConclusionVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_handoff_tenant_fkey" FOREIGN KEY ("repairHandoffVersionId", "organizationId") REFERENCES "DiagnosticRepairHandoffVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_repair_diagnosis_fkey" FOREIGN KEY ("repairDiagnosisVersionId") REFERENCES "RepairDiagnosisVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_author_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEstimateDraftVersion" ADD CONSTRAINT "DiagnosticEstimateDraft_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticEstimateDraftVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_estimate_draft_lineage() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticCase" WHERE "id" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId" AND "repairOrderId" = NEW."repairOrderId") THEN RAISE EXCEPTION 'estimate draft case and repair order must share tenant and source record'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticConclusionVersion" WHERE "id" = NEW."conclusionVersionId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "concernVersionId" = NEW."concernVersionId" AND "status" = 'CONFIRMED' AND "conclusionChecksum" = NEW."conclusionChecksum") THEN RAISE EXCEPTION 'estimate draft must bind to a confirmed conclusion with exact checksum'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticRepairHandoffVersion" WHERE "id" = NEW."repairHandoffVersionId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "repairOrderId" = NEW."repairOrderId" AND "handoffType" = 'PUBLISH_DIAGNOSIS' AND "status" = 'PUBLISHED' AND "repairDiagnosisVersionId" = NEW."repairDiagnosisVersionId" AND "handoffChecksum" = NEW."repairHandoffChecksum") THEN RAISE EXCEPTION 'estimate draft must bind to a published diagnosis handoff with exact checksum'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "RepairDiagnosisVersion" WHERE "id" = NEW."repairDiagnosisVersionId" AND "organizationId" = NEW."organizationId" AND "repairOrderId" = NEW."repairOrderId") THEN RAISE EXCEPTION 'estimate draft repair diagnosis must stay within tenant and repair order'; END IF;
  IF NEW."supersedesId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DiagnosticEstimateDraftVersion" WHERE "id" = NEW."supersedesId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'estimate draft lineage must remain within one tenant and case'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticEstimateDraft_validate" BEFORE INSERT ON "DiagnosticEstimateDraftVersion" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_estimate_draft_lineage();
CREATE TRIGGER "DiagnosticEstimateDraft_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticEstimateDraftVersion" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
