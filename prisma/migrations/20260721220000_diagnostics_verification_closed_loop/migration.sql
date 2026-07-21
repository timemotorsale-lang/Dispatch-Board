CREATE TYPE "DiagnosticVerificationAction" AS ENUM ('PLAN', 'PASS', 'FAIL', 'INCONCLUSIVE', 'UNSAFE');
CREATE TYPE "DiagnosticVerificationStatus" AS ENUM ('PLANNED', 'PASSED', 'FAILED', 'INCONCLUSIVE', 'UNSAFE');

CREATE TABLE "DiagnosticVerificationVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL,
  "concernVersionId" TEXT NOT NULL, "conclusionVersionId" TEXT NOT NULL, "repairHandoffVersionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "action" "DiagnosticVerificationAction" NOT NULL, "status" "DiagnosticVerificationStatus" NOT NULL,
  "originalConcern" TEXT NOT NULL, "repairSummary" TEXT NOT NULL, "planChecks" JSONB NOT NULL, "performedChecks" JSONB NOT NULL,
  "regressionChecks" JSONB NOT NULL, "limitations" JSONB NOT NULL, "roadTestSafety" TEXT NOT NULL, "repairEvidenceSnapshot" JSONB NOT NULL,
  "outcomeSummary" TEXT, "policyVersion" TEXT NOT NULL, "conclusionChecksum" TEXT NOT NULL, "repairHandoffChecksum" TEXT NOT NULL,
  "verificationChecksum" TEXT NOT NULL, "controlDecisionChecksum" TEXT NOT NULL, "authorUserId" TEXT NOT NULL, "reviewerUserId" TEXT,
  "supersedesId" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticVerificationVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticVerification_identity_check" CHECK ("version" > 0 AND BTRIM("policyVersion") <> '' AND LENGTH(BTRIM("originalConcern")) >= 1 AND LENGTH(BTRIM("repairSummary")) >= 10),
  CONSTRAINT "DiagnosticVerification_checksum_check" CHECK ("conclusionChecksum" ~ '^[0-9a-f]{64}$' AND "repairHandoffChecksum" ~ '^[0-9a-f]{64}$' AND "verificationChecksum" ~ '^[0-9a-f]{64}$' AND "controlDecisionChecksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticVerification_action_status_check" CHECK (("action" = 'PLAN' AND "status" = 'PLANNED') OR ("action" = 'PASS' AND "status" = 'PASSED') OR ("action" = 'FAIL' AND "status" = 'FAILED') OR ("action" = 'INCONCLUSIVE' AND "status" = 'INCONCLUSIVE') OR ("action" = 'UNSAFE' AND "status" = 'UNSAFE')),
  CONSTRAINT "DiagnosticVerification_review_check" CHECK ("reviewerUserId" IS NULL OR "reviewerUserId" <> "authorUserId"),
  CONSTRAINT "DiagnosticVerification_supersedes_check" CHECK ("supersedesId" IS NULL OR "supersedesId" <> "id")
);

CREATE UNIQUE INDEX "DiagnosticVerification_case_version_key" ON "DiagnosticVerificationVersion"("diagnosticCaseId", "version");
CREATE UNIQUE INDEX "DiagnosticVerification_id_org_key" ON "DiagnosticVerificationVersion"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticVerification_supersedes_key" ON "DiagnosticVerificationVersion"("supersedesId");
CREATE INDEX "DiagnosticVerification_org_ro_time_idx" ON "DiagnosticVerificationVersion"("organizationId", "repairOrderId", "occurredAt");
CREATE INDEX "DiagnosticVerification_org_status_time_idx" ON "DiagnosticVerificationVersion"("organizationId", "status", "occurredAt");

ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_repair_order_tenant_fkey" FOREIGN KEY ("repairOrderId", "organizationId") REFERENCES "RepairOrder"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_concern_tenant_fkey" FOREIGN KEY ("concernVersionId", "organizationId") REFERENCES "DiagnosticConcernVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_conclusion_tenant_fkey" FOREIGN KEY ("conclusionVersionId", "organizationId") REFERENCES "DiagnosticConclusionVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_handoff_tenant_fkey" FOREIGN KEY ("repairHandoffVersionId", "organizationId") REFERENCES "DiagnosticRepairHandoffVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_author_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_reviewer_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticVerificationVersion" ADD CONSTRAINT "DiagnosticVerification_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticVerificationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_verification_lineage() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticCase" WHERE "id" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId" AND "repairOrderId" = NEW."repairOrderId") THEN RAISE EXCEPTION 'verification case and repair order must share tenant and source record'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticConclusionVersion" WHERE "id" = NEW."conclusionVersionId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "concernVersionId" = NEW."concernVersionId" AND "status" = 'CONFIRMED' AND "conclusionChecksum" = NEW."conclusionChecksum") THEN RAISE EXCEPTION 'verification must bind to a confirmed conclusion with exact checksum'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticRepairHandoffVersion" WHERE "id" = NEW."repairHandoffVersionId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "repairOrderId" = NEW."repairOrderId" AND "status" = 'PUBLISHED' AND "handoffChecksum" = NEW."repairHandoffChecksum") THEN RAISE EXCEPTION 'verification must bind to a published repair handoff with exact checksum'; END IF;
  IF NEW."supersedesId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DiagnosticVerificationVersion" WHERE "id" = NEW."supersedesId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'verification lineage must remain within one tenant and case'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticVerification_validate" BEFORE INSERT ON "DiagnosticVerificationVersion" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_verification_lineage();
CREATE TRIGGER "DiagnosticVerification_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticVerificationVersion" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
