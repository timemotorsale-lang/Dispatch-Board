CREATE TABLE "DiagnosticAdaptiveTestEvaluation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "reasoningEvaluationId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL, "engineVersion" TEXT NOT NULL, "eligibilityPolicyVersion" TEXT NOT NULL, "optimizationPolicyVersion" TEXT NOT NULL,
  "reasoningResultChecksum" TEXT NOT NULL, "weights" JSONB NOT NULL, "weightsChecksum" TEXT NOT NULL, "lookAhead" JSONB NOT NULL,
  "eligibleTests" JSONB NOT NULL, "excludedTests" JSONB NOT NULL, "recommendedTestKey" TEXT, "alternatives" JSONB NOT NULL,
  "abstentionRequired" BOOLEAN NOT NULL, "reasonCodes" JSONB NOT NULL, "inputChecksum" TEXT NOT NULL, "resultChecksum" TEXT NOT NULL,
  "evaluatedByUserId" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticAdaptiveTestEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticAdaptiveTestEvaluation_identity_check" CHECK ("sequence" > 0 AND BTRIM("engineVersion") <> '' AND BTRIM("eligibilityPolicyVersion") <> '' AND BTRIM("optimizationPolicyVersion") <> ''),
  CONSTRAINT "DiagnosticAdaptiveTestEvaluation_checksum_check" CHECK ("reasoningResultChecksum" ~ '^[0-9a-f]{64}$' AND "weightsChecksum" ~ '^[0-9a-f]{64}$' AND "inputChecksum" ~ '^[0-9a-f]{64}$' AND "resultChecksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticAdaptiveTestEvaluation_recommendation_check" CHECK (("abstentionRequired" AND "recommendedTestKey" IS NULL) OR (NOT "abstentionRequired" AND "recommendedTestKey" IS NOT NULL))
);

CREATE TABLE "DiagnosticAdaptiveTestOverride" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "adaptiveTestEvaluationId" TEXT NOT NULL,
  "recommendedTestKey" TEXT NOT NULL, "selectedTestKey" TEXT NOT NULL, "reasonCode" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL, "lineageChecksum" TEXT NOT NULL, "actorUserId" TEXT NOT NULL, "priorOverrideId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticAdaptiveTestOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticAdaptiveTestOverride_identity_check" CHECK (BTRIM("recommendedTestKey") <> '' AND BTRIM("selectedTestKey") <> '' AND "recommendedTestKey" <> "selectedTestKey" AND BTRIM("reason") <> '' AND BTRIM("reasonCode") <> ''),
  CONSTRAINT "DiagnosticAdaptiveTestOverride_checksum_check" CHECK ("lineageChecksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticAdaptiveTestOverride_lineage_check" CHECK ("priorOverrideId" IS NULL OR "priorOverrideId" <> "id")
);

CREATE UNIQUE INDEX "DiagnosticAdaptiveTestEvaluation_case_sequence_key" ON "DiagnosticAdaptiveTestEvaluation"("diagnosticCaseId", "sequence");
CREATE UNIQUE INDEX "DiagnosticAdaptiveTestEvaluation_id_org_key" ON "DiagnosticAdaptiveTestEvaluation"("id", "organizationId");
CREATE INDEX "DiagnosticAdaptiveTestEvaluation_org_case_time_idx" ON "DiagnosticAdaptiveTestEvaluation"("organizationId", "diagnosticCaseId", "occurredAt");
CREATE INDEX "DiagnosticAdaptiveTestEvaluation_org_abstain_time_idx" ON "DiagnosticAdaptiveTestEvaluation"("organizationId", "abstentionRequired", "occurredAt");
CREATE UNIQUE INDEX "DiagnosticAdaptiveTestOverride_id_org_key" ON "DiagnosticAdaptiveTestOverride"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticAdaptiveTestOverride_prior_key" ON "DiagnosticAdaptiveTestOverride"("priorOverrideId");
CREATE INDEX "DiagnosticAdaptiveTestOverride_org_case_time_idx" ON "DiagnosticAdaptiveTestOverride"("organizationId", "diagnosticCaseId", "occurredAt");
CREATE INDEX "DiagnosticAdaptiveTestOverride_evaluation_time_idx" ON "DiagnosticAdaptiveTestOverride"("adaptiveTestEvaluationId", "occurredAt");

ALTER TABLE "DiagnosticAdaptiveTestEvaluation" ADD CONSTRAINT "DiagnosticAdaptiveTestEvaluation_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAdaptiveTestEvaluation" ADD CONSTRAINT "DiagnosticAdaptiveTestEvaluation_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAdaptiveTestEvaluation" ADD CONSTRAINT "DiagnosticAdaptiveTestEvaluation_reasoning_tenant_fkey" FOREIGN KEY ("reasoningEvaluationId", "organizationId") REFERENCES "DiagnosticReasoningEvaluation"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAdaptiveTestEvaluation" ADD CONSTRAINT "DiagnosticAdaptiveTestEvaluation_user_fkey" FOREIGN KEY ("evaluatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAdaptiveTestOverride" ADD CONSTRAINT "DiagnosticAdaptiveTestOverride_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAdaptiveTestOverride" ADD CONSTRAINT "DiagnosticAdaptiveTestOverride_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAdaptiveTestOverride" ADD CONSTRAINT "DiagnosticAdaptiveTestOverride_evaluation_tenant_fkey" FOREIGN KEY ("adaptiveTestEvaluationId", "organizationId") REFERENCES "DiagnosticAdaptiveTestEvaluation"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAdaptiveTestOverride" ADD CONSTRAINT "DiagnosticAdaptiveTestOverride_actor_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAdaptiveTestOverride" ADD CONSTRAINT "DiagnosticAdaptiveTestOverride_prior_fkey" FOREIGN KEY ("priorOverrideId") REFERENCES "DiagnosticAdaptiveTestOverride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_adaptive_testing_lineage() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'DiagnosticAdaptiveTestEvaluation' THEN
    IF NOT EXISTS (SELECT 1 FROM "DiagnosticReasoningEvaluation" WHERE "id" = NEW."reasoningEvaluationId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "resultChecksum" = NEW."reasoningResultChecksum") THEN RAISE EXCEPTION 'adaptive test evaluation must bind to the same tenant, case, and reasoning checksum'; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM "DiagnosticAdaptiveTestEvaluation" WHERE "id" = NEW."adaptiveTestEvaluationId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId") THEN RAISE EXCEPTION 'adaptive test override must remain within the same tenant, case, and evaluation'; END IF;
    IF NEW."priorOverrideId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DiagnosticAdaptiveTestOverride" WHERE "id" = NEW."priorOverrideId" AND "organizationId" = NEW."organizationId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "adaptiveTestEvaluationId" = NEW."adaptiveTestEvaluationId") THEN RAISE EXCEPTION 'adaptive test override lineage must remain within one evaluation'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticAdaptiveTestEvaluation_validate" BEFORE INSERT ON "DiagnosticAdaptiveTestEvaluation" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_adaptive_testing_lineage();
CREATE TRIGGER "DiagnosticAdaptiveTestOverride_validate" BEFORE INSERT ON "DiagnosticAdaptiveTestOverride" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_adaptive_testing_lineage();
CREATE TRIGGER "DiagnosticAdaptiveTestEvaluation_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticAdaptiveTestEvaluation" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticAdaptiveTestOverride_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticAdaptiveTestOverride" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
