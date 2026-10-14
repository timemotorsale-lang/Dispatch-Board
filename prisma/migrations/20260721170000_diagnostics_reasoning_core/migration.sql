CREATE TYPE "DiagnosticHypothesisStatus" AS ENUM ('GENERATED', 'SUPPORTED', 'CONTRADICTED', 'DISCRIMINATION_REQUIRED', 'OUT_OF_MODEL', 'REJECTED_BY_TECHNICIAN', 'CONFIRMED', 'SUPERSEDED');
CREATE TYPE "DiagnosticHypothesisEvidenceRelationship" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'ASSUMES', 'RETRACTS');
CREATE TYPE "DiagnosticHypothesisEvidenceType" AS ENUM ('OBSERVATION', 'MEASUREMENT', 'TEST_EXECUTION', 'MODEL_FACT');

CREATE TABLE "DiagnosticReasoningEvaluation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "concernVersionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL, "engineVersion" TEXT NOT NULL, "policyVersion" TEXT NOT NULL, "modelVersion" TEXT NOT NULL,
  "ruleSetVersion" TEXT NOT NULL, "knowledgeChecksum" TEXT NOT NULL, "calculationVersions" JSONB NOT NULL,
  "sourceVersions" JSONB NOT NULL, "vehicleContext" JSONB NOT NULL, "includedEvidence" JSONB NOT NULL,
  "excludedEvidence" JSONB NOT NULL, "assumptions" JSONB NOT NULL, "abnormalModes" JSONB NOT NULL,
  "conflicts" JSONB NOT NULL, "candidateDiagnoses" JSONB NOT NULL, "causalPredictions" JSONB NOT NULL,
  "missingExpectedEffects" JSONB NOT NULL, "recommendedTests" JSONB NOT NULL, "hardBlockers" JSONB NOT NULL,
  "reasonCodes" JSONB NOT NULL, "bounds" JSONB NOT NULL, "generationComplete" BOOLEAN NOT NULL,
  "abstentionRequired" BOOLEAN NOT NULL, "timedOut" BOOLEAN NOT NULL, "degraded" BOOLEAN NOT NULL,
  "computationDurationMs" INTEGER NOT NULL, "inputChecksum" TEXT NOT NULL, "resultChecksum" TEXT NOT NULL,
  "evaluatedByUserId" TEXT NOT NULL, "supersedesId" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticReasoningEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticReasoning_identity_check" CHECK ("sequence" > 0 AND BTRIM("engineVersion") <> '' AND BTRIM("policyVersion") <> '' AND BTRIM("modelVersion") <> '' AND BTRIM("ruleSetVersion") <> ''),
  CONSTRAINT "DiagnosticReasoning_checksum_check" CHECK ("knowledgeChecksum" ~ '^[0-9a-f]{64}$' AND "inputChecksum" ~ '^[0-9a-f]{64}$' AND "resultChecksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticReasoning_computation_check" CHECK ("computationDurationMs" >= 0),
  CONSTRAINT "DiagnosticReasoning_completion_check" CHECK (NOT "generationComplete" OR (NOT "timedOut" AND NOT "degraded")),
  CONSTRAINT "DiagnosticReasoning_supersedes_check" CHECK ("supersedesId" IS NULL OR "supersedesId" <> "id")
);

CREATE TABLE "DiagnosticHypothesis" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "reasoningEvaluationId" TEXT NOT NULL,
  "hypothesisKey" TEXT NOT NULL, "status" "DiagnosticHypothesisStatus" NOT NULL, "candidateAssumptions" JSONB NOT NULL,
  "abnormalModes" JSONB NOT NULL, "commonCause" BOOLEAN NOT NULL DEFAULT false, "intermittent" BOOLEAN NOT NULL DEFAULT false,
  "rank" INTEGER NOT NULL, "causalState" TEXT NOT NULL, "explanationCodes" JSONB NOT NULL,
  "supportingEvidenceKeys" JSONB NOT NULL, "contradictingEvidenceKeys" JSONB NOT NULL,
  "missingExpectedEvidenceKeys" JSONB NOT NULL, "supersedesId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticHypothesis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticHypothesis_identity_check" CHECK (BTRIM("hypothesisKey") <> '' AND "rank" > 0 AND BTRIM("causalState") <> ''),
  CONSTRAINT "DiagnosticHypothesis_supersedes_check" CHECK ("supersedesId" IS NULL OR "supersedesId" <> "id")
);

CREATE TABLE "DiagnosticHypothesisEvidence" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "hypothesisId" TEXT NOT NULL,
  "evidenceKey" TEXT NOT NULL, "evidenceType" "DiagnosticHypothesisEvidenceType" NOT NULL,
  "relationship" "DiagnosticHypothesisEvidenceRelationship" NOT NULL, "observationId" TEXT, "measurementId" TEXT,
  "testExecutionId" TEXT, "independenceGroup" TEXT NOT NULL, "rationaleCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticHypothesisEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticHypothesisEvidence_identity_check" CHECK (BTRIM("evidenceKey") <> '' AND BTRIM("independenceGroup") <> '' AND BTRIM("rationaleCode") <> ''),
  CONSTRAINT "DiagnosticHypothesisEvidence_target_check" CHECK (
    ("evidenceType" = 'OBSERVATION' AND "observationId" IS NOT NULL AND "measurementId" IS NULL AND "testExecutionId" IS NULL) OR
    ("evidenceType" = 'MEASUREMENT' AND "observationId" IS NULL AND "measurementId" IS NOT NULL AND "testExecutionId" IS NULL) OR
    ("evidenceType" = 'TEST_EXECUTION' AND "observationId" IS NULL AND "measurementId" IS NULL AND "testExecutionId" IS NOT NULL) OR
    ("evidenceType" = 'MODEL_FACT' AND "observationId" IS NULL AND "measurementId" IS NULL AND "testExecutionId" IS NULL)
  )
);

CREATE UNIQUE INDEX "DiagnosticReasoning_case_sequence_key" ON "DiagnosticReasoningEvaluation"("diagnosticCaseId", "sequence");
CREATE UNIQUE INDEX "DiagnosticReasoning_id_org_key" ON "DiagnosticReasoningEvaluation"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticReasoning_supersedes_key" ON "DiagnosticReasoningEvaluation"("supersedesId");
CREATE INDEX "DiagnosticReasoning_org_case_time_idx" ON "DiagnosticReasoningEvaluation"("organizationId", "diagnosticCaseId", "occurredAt");
CREATE INDEX "DiagnosticReasoning_org_abstain_time_idx" ON "DiagnosticReasoningEvaluation"("organizationId", "abstentionRequired", "occurredAt");
CREATE UNIQUE INDEX "DiagnosticHypothesis_evaluation_key_key" ON "DiagnosticHypothesis"("reasoningEvaluationId", "hypothesisKey");
CREATE UNIQUE INDEX "DiagnosticHypothesis_id_org_key" ON "DiagnosticHypothesis"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticHypothesis_supersedes_key" ON "DiagnosticHypothesis"("supersedesId");
CREATE INDEX "DiagnosticHypothesis_case_status_created_idx" ON "DiagnosticHypothesis"("diagnosticCaseId", "status", "createdAt");
CREATE INDEX "DiagnosticHypothesis_org_key_created_idx" ON "DiagnosticHypothesis"("organizationId", "hypothesisKey", "createdAt");
CREATE UNIQUE INDEX "DiagnosticHypothesisEvidence_unique" ON "DiagnosticHypothesisEvidence"("hypothesisId", "evidenceKey", "relationship");
CREATE UNIQUE INDEX "DiagnosticHypothesisEvidence_id_org_key" ON "DiagnosticHypothesisEvidence"("id", "organizationId");
CREATE INDEX "DiagnosticHypothesisEvidence_case_created_idx" ON "DiagnosticHypothesisEvidence"("diagnosticCaseId", "createdAt");
CREATE INDEX "DiagnosticHypothesisEvidence_org_type_relationship_idx" ON "DiagnosticHypothesisEvidence"("organizationId", "evidenceType", "relationship");

ALTER TABLE "DiagnosticReasoningEvaluation" ADD CONSTRAINT "DiagnosticReasoning_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticReasoningEvaluation" ADD CONSTRAINT "DiagnosticReasoning_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticReasoningEvaluation" ADD CONSTRAINT "DiagnosticReasoning_concern_tenant_fkey" FOREIGN KEY ("concernVersionId", "organizationId") REFERENCES "DiagnosticConcernVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticReasoningEvaluation" ADD CONSTRAINT "DiagnosticReasoning_evaluator_fkey" FOREIGN KEY ("evaluatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticReasoningEvaluation" ADD CONSTRAINT "DiagnosticReasoning_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticReasoningEvaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesis" ADD CONSTRAINT "DiagnosticHypothesis_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesis" ADD CONSTRAINT "DiagnosticHypothesis_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesis" ADD CONSTRAINT "DiagnosticHypothesis_evaluation_tenant_fkey" FOREIGN KEY ("reasoningEvaluationId", "organizationId") REFERENCES "DiagnosticReasoningEvaluation"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesis" ADD CONSTRAINT "DiagnosticHypothesis_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticHypothesis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesisEvidence" ADD CONSTRAINT "DiagnosticHypothesisEvidence_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesisEvidence" ADD CONSTRAINT "DiagnosticHypothesisEvidence_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesisEvidence" ADD CONSTRAINT "DiagnosticHypothesisEvidence_hypothesis_tenant_fkey" FOREIGN KEY ("hypothesisId", "organizationId") REFERENCES "DiagnosticHypothesis"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesisEvidence" ADD CONSTRAINT "DiagnosticHypothesisEvidence_observation_tenant_fkey" FOREIGN KEY ("observationId", "organizationId") REFERENCES "DiagnosticObservation"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesisEvidence" ADD CONSTRAINT "DiagnosticHypothesisEvidence_measurement_tenant_fkey" FOREIGN KEY ("measurementId", "organizationId") REFERENCES "DiagnosticMeasurement"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticHypothesisEvidence" ADD CONSTRAINT "DiagnosticHypothesisEvidence_execution_tenant_fkey" FOREIGN KEY ("testExecutionId", "organizationId") REFERENCES "DiagnosticTestExecution"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_reasoning_lineage() RETURNS trigger AS $$
DECLARE prior_org TEXT; prior_case TEXT; prior_key TEXT;
BEGIN
  IF TG_TABLE_NAME = 'DiagnosticReasoningEvaluation' AND NEW."supersedesId" IS NOT NULL THEN
    SELECT "organizationId", "diagnosticCaseId" INTO prior_org, prior_case FROM "DiagnosticReasoningEvaluation" WHERE "id" = NEW."supersedesId";
    IF prior_org <> NEW."organizationId" OR prior_case <> NEW."diagnosticCaseId" THEN RAISE EXCEPTION 'reasoning lineage must remain within one tenant and case'; END IF;
  ELSIF TG_TABLE_NAME = 'DiagnosticHypothesis' AND NEW."supersedesId" IS NOT NULL THEN
    SELECT "organizationId", "diagnosticCaseId", "hypothesisKey" INTO prior_org, prior_case, prior_key FROM "DiagnosticHypothesis" WHERE "id" = NEW."supersedesId";
    IF prior_org <> NEW."organizationId" OR prior_case <> NEW."diagnosticCaseId" OR prior_key <> NEW."hypothesisKey" THEN RAISE EXCEPTION 'hypothesis lineage must remain within one tenant, case, and key'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION validate_diagnostic_hypothesis_evidence() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DiagnosticHypothesis" WHERE "id" = NEW."hypothesisId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'hypothesis evidence must belong to the same tenant and case'; END IF;
  IF NEW."evidenceType" = 'OBSERVATION' AND NOT EXISTS (SELECT 1 FROM "DiagnosticObservation" WHERE "id" = NEW."observationId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'hypothesis observation evidence target is invalid'; END IF;
  IF NEW."evidenceType" = 'MEASUREMENT' AND NOT EXISTS (SELECT 1 FROM "DiagnosticMeasurement" WHERE "id" = NEW."measurementId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'hypothesis measurement evidence target is invalid'; END IF;
  IF NEW."evidenceType" = 'TEST_EXECUTION' AND NOT EXISTS (SELECT 1 FROM "DiagnosticTestExecution" WHERE "id" = NEW."testExecutionId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'hypothesis test evidence target is invalid'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticReasoning_lineage" BEFORE INSERT ON "DiagnosticReasoningEvaluation" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_reasoning_lineage();
CREATE TRIGGER "DiagnosticHypothesis_lineage" BEFORE INSERT ON "DiagnosticHypothesis" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_reasoning_lineage();
CREATE TRIGGER "DiagnosticHypothesisEvidence_validate" BEFORE INSERT ON "DiagnosticHypothesisEvidence" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_hypothesis_evidence();
CREATE TRIGGER "DiagnosticReasoning_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticReasoningEvaluation" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticHypothesis_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticHypothesis" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticHypothesisEvidence_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticHypothesisEvidence" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
