CREATE TYPE "DiagnosticConclusionAction" AS ENUM ('PROPOSE', 'CONFIRM', 'REJECT', 'SUPERSEDE', 'ABSTAIN', 'ESCALATE');
CREATE TYPE "DiagnosticConclusionStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED', 'ABSTAINED', 'ESCALATED');

CREATE TABLE "DiagnosticConclusionVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "concernVersionId" TEXT NOT NULL,
  "reasoningEvaluationId" TEXT NOT NULL, "hypothesisId" TEXT, "version" INTEGER NOT NULL,
  "action" "DiagnosticConclusionAction" NOT NULL, "status" "DiagnosticConclusionStatus" NOT NULL,
  "causeStatement" TEXT, "uncertainty" TEXT NOT NULL, "evidenceBasisKeys" JSONB NOT NULL, "contradictionKeys" JSONB NOT NULL,
  "addressedAlternativeKeys" JSONB NOT NULL, "limitations" JSONB NOT NULL, "sourceVersions" JSONB NOT NULL, "safetySnapshot" JSONB NOT NULL,
  "policyVersion" TEXT NOT NULL, "reasoningResultChecksum" TEXT NOT NULL, "controlDecisionChecksum" TEXT NOT NULL,
  "conclusionChecksum" TEXT NOT NULL, "authorUserId" TEXT NOT NULL, "reviewerUserId" TEXT, "supersedesId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticConclusionVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticConclusion_identity_check" CHECK ("version" > 0 AND BTRIM("policyVersion") <> '' AND "uncertainty" IN ('LOW','MEDIUM','HIGH','UNKNOWN')),
  CONSTRAINT "DiagnosticConclusion_checksum_check" CHECK ("reasoningResultChecksum" ~ '^[0-9a-f]{64}$' AND "controlDecisionChecksum" ~ '^[0-9a-f]{64}$' AND "conclusionChecksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticConclusion_cause_check" CHECK (("status" IN ('PROPOSED','CONFIRMED') AND "hypothesisId" IS NOT NULL AND LENGTH(BTRIM("causeStatement")) >= 10) OR ("status" IN ('REJECTED','ABSTAINED','ESCALATED'))),
  CONSTRAINT "DiagnosticConclusion_review_check" CHECK ("reviewerUserId" IS NULL OR "reviewerUserId" <> "authorUserId"),
  CONSTRAINT "DiagnosticConclusion_supersedes_check" CHECK ("supersedesId" IS NULL OR "supersedesId" <> "id")
);

CREATE UNIQUE INDEX "DiagnosticConclusion_case_version_key" ON "DiagnosticConclusionVersion"("diagnosticCaseId", "version");
CREATE UNIQUE INDEX "DiagnosticConclusion_id_org_key" ON "DiagnosticConclusionVersion"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticConclusion_supersedes_key" ON "DiagnosticConclusionVersion"("supersedesId");
CREATE INDEX "DiagnosticConclusion_org_case_time_idx" ON "DiagnosticConclusionVersion"("organizationId", "diagnosticCaseId", "occurredAt");
CREATE INDEX "DiagnosticConclusion_org_status_time_idx" ON "DiagnosticConclusionVersion"("organizationId", "status", "occurredAt");

ALTER TABLE "DiagnosticConclusionVersion" ADD CONSTRAINT "DiagnosticConclusion_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConclusionVersion" ADD CONSTRAINT "DiagnosticConclusion_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConclusionVersion" ADD CONSTRAINT "DiagnosticConclusion_concern_tenant_fkey" FOREIGN KEY ("concernVersionId", "organizationId") REFERENCES "DiagnosticConcernVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConclusionVersion" ADD CONSTRAINT "DiagnosticConclusion_reasoning_tenant_fkey" FOREIGN KEY ("reasoningEvaluationId", "organizationId") REFERENCES "DiagnosticReasoningEvaluation"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConclusionVersion" ADD CONSTRAINT "DiagnosticConclusion_hypothesis_tenant_fkey" FOREIGN KEY ("hypothesisId", "organizationId") REFERENCES "DiagnosticHypothesis"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConclusionVersion" ADD CONSTRAINT "DiagnosticConclusion_author_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConclusionVersion" ADD CONSTRAINT "DiagnosticConclusion_reviewer_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticConclusionVersion" ADD CONSTRAINT "DiagnosticConclusion_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticConclusionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_conclusion_lineage() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticReasoningEvaluation" WHERE "id" = NEW."reasoningEvaluationId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "concernVersionId" = NEW."concernVersionId" AND "resultChecksum" = NEW."reasoningResultChecksum") THEN RAISE EXCEPTION 'conclusion must bind to the same tenant, case, concern, reasoning result, and checksum'; END IF;
  IF NEW."hypothesisId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DiagnosticHypothesis" WHERE "id" = NEW."hypothesisId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "reasoningEvaluationId" = NEW."reasoningEvaluationId") THEN RAISE EXCEPTION 'conclusion hypothesis must belong to the bound reasoning evaluation'; END IF;
  IF NEW."supersedesId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DiagnosticConclusionVersion" WHERE "id" = NEW."supersedesId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'conclusion lineage must remain within one tenant and case'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticConclusion_validate" BEFORE INSERT ON "DiagnosticConclusionVersion" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_conclusion_lineage();
CREATE TRIGGER "DiagnosticConclusion_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticConclusionVersion" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
