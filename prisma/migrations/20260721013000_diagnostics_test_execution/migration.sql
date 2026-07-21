CREATE TYPE "DiagnosticTestPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');
CREATE TYPE "DiagnosticTestExecutionState" AS ENUM ('PLANNED', 'READY', 'BLOCKED', 'RUNNING', 'PAUSED', 'COMPLETED', 'INVALIDATED', 'CANCELLED');

CREATE TABLE "DiagnosticTestDefinitionVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "definitionKey" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL, "purpose" TEXT NOT NULL, "ontologyLinks" JSONB NOT NULL, "applicability" JSONB NOT NULL,
  "qualifications" JSONB NOT NULL, "hazards" JSONB NOT NULL, "prerequisites" JSONB NOT NULL, "tools" JSONB NOT NULL,
  "vehicleState" JSONB NOT NULL, "procedure" JSONB NOT NULL, "branches" JSONB NOT NULL, "interpretations" JSONB NOT NULL,
  "requiredEvidence" JSONB NOT NULL, "sourceVersions" JSONB NOT NULL, "estimatedMinutes" INTEGER NOT NULL,
  "estimatedCostDecimal" DECIMAL(12,2), "riskTier" "DiagnosticRiskTier" NOT NULL, "checksum" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3), "authoredByUserId" TEXT NOT NULL,
  "supersedesId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticTestDefinitionVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticTestDefinition_content_check" CHECK (BTRIM("definitionKey") <> '' AND BTRIM("name") <> '' AND BTRIM("purpose") <> '' AND BTRIM("checksum") <> '' AND "version" > 0 AND "estimatedMinutes" > 0),
  CONSTRAINT "DiagnosticTestDefinition_time_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "effectiveAt")
);

CREATE TABLE "DiagnosticTestPlanVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" "DiagnosticTestPlanStatus" NOT NULL DEFAULT 'ACTIVE', "rationale" TEXT NOT NULL, "applicability" JSONB NOT NULL,
  "graphChecksum" TEXT NOT NULL, "authoredByUserId" TEXT NOT NULL, "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticTestPlanVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticTestPlan_content_check" CHECK (BTRIM("rationale") <> '' AND BTRIM("graphChecksum") <> '' AND "version" > 0)
);

CREATE TABLE "DiagnosticTestPlanNode" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "testPlanVersionId" TEXT NOT NULL,
  "definitionVersionId" TEXT NOT NULL, "nodeKey" TEXT NOT NULL, "sequence" INTEGER NOT NULL, "title" TEXT NOT NULL,
  "dependencyNodeKeys" JSONB NOT NULL, "branchRules" JSONB NOT NULL, "requiredEvidenceOverride" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticTestPlanNode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticTestPlanNode_content_check" CHECK (BTRIM("nodeKey") <> '' AND BTRIM("title") <> '' AND "sequence" > 0)
);

CREATE TABLE "DiagnosticTestExecution" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "diagnosticCaseId" TEXT NOT NULL, "planNodeId" TEXT NOT NULL,
  "definitionVersionId" TEXT NOT NULL, "executionKey" TEXT NOT NULL, "revision" INTEGER NOT NULL,
  "state" "DiagnosticTestExecutionState" NOT NULL, "reasonCode" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "actualConditions" JSONB NOT NULL, "deviations" JSONB NOT NULL, "inputs" JSONB NOT NULL, "results" JSONB NOT NULL,
  "evidenceSummary" JSONB NOT NULL, "prerequisiteSnapshot" JSONB NOT NULL, "actorUserId" TEXT NOT NULL,
  "previousEventId" TEXT, "repeatOfExecutionKey" TEXT, "startedAt" TIMESTAMP(3), "pausedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "invalidatedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticTestExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticTestExecution_content_check" CHECK (BTRIM("executionKey") <> '' AND BTRIM("reasonCode") <> '' AND BTRIM("reason") <> '' AND "revision" > 0),
  CONSTRAINT "DiagnosticTestExecution_state_time_check" CHECK (
    ("state" <> 'RUNNING' OR "startedAt" IS NOT NULL) AND
    ("state" <> 'PAUSED' OR ("startedAt" IS NOT NULL AND "pausedAt" IS NOT NULL)) AND
    ("state" <> 'COMPLETED' OR "completedAt" IS NOT NULL) AND
    ("state" <> 'INVALIDATED' OR "invalidatedAt" IS NOT NULL) AND
    ("state" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "DiagnosticTestDefinition_org_key_version_key" ON "DiagnosticTestDefinitionVersion"("organizationId", "definitionKey", "version");
CREATE UNIQUE INDEX "DiagnosticTestDefinition_id_org_key" ON "DiagnosticTestDefinitionVersion"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticTestDefinition_supersedesId_key" ON "DiagnosticTestDefinitionVersion"("supersedesId");
CREATE INDEX "DiagnosticTestDefinition_org_key_effective_idx" ON "DiagnosticTestDefinitionVersion"("organizationId", "definitionKey", "effectiveAt");
CREATE INDEX "DiagnosticTestDefinition_org_expiry_idx" ON "DiagnosticTestDefinitionVersion"("organizationId", "expiresAt");
CREATE UNIQUE INDEX "DiagnosticTestPlan_case_version_key" ON "DiagnosticTestPlanVersion"("diagnosticCaseId", "version");
CREATE UNIQUE INDEX "DiagnosticTestPlan_id_org_key" ON "DiagnosticTestPlanVersion"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticTestPlan_supersedesId_key" ON "DiagnosticTestPlanVersion"("supersedesId");
CREATE INDEX "DiagnosticTestPlan_org_status_created_idx" ON "DiagnosticTestPlanVersion"("organizationId", "status", "createdAt");
CREATE UNIQUE INDEX "DiagnosticTestPlanNode_plan_key_key" ON "DiagnosticTestPlanNode"("testPlanVersionId", "nodeKey");
CREATE UNIQUE INDEX "DiagnosticTestPlanNode_id_org_key" ON "DiagnosticTestPlanNode"("id", "organizationId");
CREATE INDEX "DiagnosticTestPlanNode_case_sequence_idx" ON "DiagnosticTestPlanNode"("diagnosticCaseId", "sequence");
CREATE UNIQUE INDEX "DiagnosticTestExecution_key_revision_key" ON "DiagnosticTestExecution"("executionKey", "revision");
CREATE UNIQUE INDEX "DiagnosticTestExecution_previousEventId_key" ON "DiagnosticTestExecution"("previousEventId");
CREATE UNIQUE INDEX "DiagnosticTestExecution_id_org_key" ON "DiagnosticTestExecution"("id", "organizationId");
CREATE INDEX "DiagnosticTestExecution_case_occurred_idx" ON "DiagnosticTestExecution"("diagnosticCaseId", "occurredAt");
CREATE INDEX "DiagnosticTestExecution_org_state_occurred_idx" ON "DiagnosticTestExecution"("organizationId", "state", "occurredAt");
CREATE INDEX "DiagnosticTestExecution_node_occurred_idx" ON "DiagnosticTestExecution"("planNodeId", "occurredAt");

ALTER TABLE "DiagnosticTestDefinitionVersion" ADD CONSTRAINT "DiagnosticTestDefinition_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestDefinitionVersion" ADD CONSTRAINT "DiagnosticTestDefinition_author_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestDefinitionVersion" ADD CONSTRAINT "DiagnosticTestDefinition_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticTestDefinitionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestPlanVersion" ADD CONSTRAINT "DiagnosticTestPlan_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestPlanVersion" ADD CONSTRAINT "DiagnosticTestPlan_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestPlanVersion" ADD CONSTRAINT "DiagnosticTestPlan_author_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestPlanVersion" ADD CONSTRAINT "DiagnosticTestPlan_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticTestPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestPlanNode" ADD CONSTRAINT "DiagnosticTestPlanNode_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestPlanNode" ADD CONSTRAINT "DiagnosticTestPlanNode_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestPlanNode" ADD CONSTRAINT "DiagnosticTestPlanNode_plan_tenant_fkey" FOREIGN KEY ("testPlanVersionId", "organizationId") REFERENCES "DiagnosticTestPlanVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestPlanNode" ADD CONSTRAINT "DiagnosticTestPlanNode_definition_tenant_fkey" FOREIGN KEY ("definitionVersionId", "organizationId") REFERENCES "DiagnosticTestDefinitionVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestExecution" ADD CONSTRAINT "DiagnosticTestExecution_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestExecution" ADD CONSTRAINT "DiagnosticTestExecution_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestExecution" ADD CONSTRAINT "DiagnosticTestExecution_node_tenant_fkey" FOREIGN KEY ("planNodeId", "organizationId") REFERENCES "DiagnosticTestPlanNode"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestExecution" ADD CONSTRAINT "DiagnosticTestExecution_definition_tenant_fkey" FOREIGN KEY ("definitionVersionId", "organizationId") REFERENCES "DiagnosticTestDefinitionVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestExecution" ADD CONSTRAINT "DiagnosticTestExecution_actor_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTestExecution" ADD CONSTRAINT "DiagnosticTestExecution_previous_fkey" FOREIGN KEY ("previousEventId") REFERENCES "DiagnosticTestExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiagnosticEvidenceLink" ADD COLUMN "testExecutionId" TEXT;
ALTER TABLE "DiagnosticEvidenceLink" DROP CONSTRAINT "DiagnosticEvidenceLink_typed_target_check";
ALTER TABLE "DiagnosticEvidenceLink" ADD CONSTRAINT "DiagnosticEvidenceLink_typed_target_check" CHECK (
  ("subjectType" = 'OBSERVATION' AND "observationId" = "subjectId" AND "measurementId" IS NULL AND "testExecutionId" IS NULL) OR
  ("subjectType" = 'MEASUREMENT' AND "measurementId" = "subjectId" AND "observationId" IS NULL AND "testExecutionId" IS NULL) OR
  ("subjectType" = 'TEST_EXECUTION' AND "testExecutionId" = "subjectId" AND "observationId" IS NULL AND "measurementId" IS NULL) OR
  ("subjectType" NOT IN ('OBSERVATION', 'MEASUREMENT', 'TEST_EXECUTION') AND "observationId" IS NULL AND "measurementId" IS NULL AND "testExecutionId" IS NULL)
);
ALTER TABLE "DiagnosticEvidenceLink" ADD CONSTRAINT "DiagnosticEvidenceLink_execution_tenant_fkey" FOREIGN KEY ("testExecutionId", "organizationId") REFERENCES "DiagnosticTestExecution"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_test_lineage() RETURNS trigger AS $$
DECLARE prior_case TEXT; prior_org TEXT; prior_key TEXT;
BEGIN
  IF TG_TABLE_NAME = 'DiagnosticTestDefinitionVersion' AND NEW."supersedesId" IS NOT NULL THEN
    SELECT "organizationId", "definitionKey" INTO prior_org, prior_key FROM "DiagnosticTestDefinitionVersion" WHERE "id" = NEW."supersedesId";
    IF prior_org <> NEW."organizationId" OR prior_key <> NEW."definitionKey" THEN RAISE EXCEPTION 'test definition lineage must remain within one tenant and key'; END IF;
  ELSIF TG_TABLE_NAME = 'DiagnosticTestPlanVersion' AND NEW."supersedesId" IS NOT NULL THEN
    SELECT "organizationId", "diagnosticCaseId" INTO prior_org, prior_case FROM "DiagnosticTestPlanVersion" WHERE "id" = NEW."supersedesId";
    IF prior_org <> NEW."organizationId" OR prior_case <> NEW."diagnosticCaseId" THEN RAISE EXCEPTION 'test plan lineage must remain within one tenant and case'; END IF;
  ELSIF TG_TABLE_NAME = 'DiagnosticTestExecution' AND NEW."previousEventId" IS NOT NULL THEN
    SELECT "organizationId", "diagnosticCaseId", "executionKey" INTO prior_org, prior_case, prior_key FROM "DiagnosticTestExecution" WHERE "id" = NEW."previousEventId";
    IF prior_org <> NEW."organizationId" OR prior_case <> NEW."diagnosticCaseId" OR prior_key <> NEW."executionKey" THEN RAISE EXCEPTION 'test execution history must remain within one tenant, case, and execution'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticTestDefinition_lineage" BEFORE INSERT ON "DiagnosticTestDefinitionVersion" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_test_lineage();
CREATE TRIGGER "DiagnosticTestPlan_lineage" BEFORE INSERT ON "DiagnosticTestPlanVersion" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_test_lineage();
CREATE TRIGGER "DiagnosticTestExecution_lineage" BEFORE INSERT ON "DiagnosticTestExecution" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_test_lineage();
CREATE TRIGGER "DiagnosticTestDefinition_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticTestDefinitionVersion" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticTestPlan_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticTestPlanVersion" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticTestPlanNode_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticTestPlanNode" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticTestExecution_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticTestExecution" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();

CREATE OR REPLACE FUNCTION validate_diagnostic_evidence_link() RETURNS trigger AS $$
DECLARE case_vehicle TEXT; evidence_status "VehicleEvidenceStatus"; malware_status "VehicleEvidenceMalwareStatus";
BEGIN
  SELECT "vehicleId" INTO case_vehicle FROM "DiagnosticCase" WHERE "id" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId";
  SELECT "status", "malwareStatus" INTO evidence_status, malware_status FROM "VehicleEvidenceObject" WHERE "id" = NEW."evidenceObjectId" AND "organizationId" = NEW."organizationId";
  IF case_vehicle IS NULL OR evidence_status IS NULL THEN RAISE EXCEPTION 'diagnostic evidence tenant or case integrity failed'; END IF;
  IF evidence_status <> 'AVAILABLE' OR malware_status <> 'CLEAN' THEN RAISE EXCEPTION 'diagnostic evidence must be available and malware-clean'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "VehicleEvidenceLink" WHERE "organizationId" = NEW."organizationId" AND "evidenceObjectId" = NEW."evidenceObjectId" AND "vehicleId" = case_vehicle) THEN RAISE EXCEPTION 'diagnostic evidence must belong to the case vehicle'; END IF;
  IF NEW."subjectType" = 'CASE' AND NEW."subjectId" <> NEW."diagnosticCaseId" THEN RAISE EXCEPTION 'case evidence target is invalid'; END IF;
  IF NEW."subjectType" = 'CONCERN' AND NOT EXISTS (SELECT 1 FROM "DiagnosticConcernVersion" WHERE "id" = NEW."subjectId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'concern evidence target is invalid'; END IF;
  IF NEW."subjectType" = 'OBSERVATION' AND NOT EXISTS (SELECT 1 FROM "DiagnosticObservation" WHERE "id" = NEW."subjectId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'observation evidence target is invalid'; END IF;
  IF NEW."subjectType" = 'MEASUREMENT' AND NOT EXISTS (SELECT 1 FROM "DiagnosticMeasurement" WHERE "id" = NEW."subjectId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'measurement evidence target is invalid'; END IF;
  IF NEW."subjectType" = 'TEST_EXECUTION' AND NOT EXISTS (SELECT 1 FROM "DiagnosticTestExecution" WHERE "id" = NEW."subjectId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'test execution evidence target is invalid'; END IF;
  IF NEW."subjectType" IN ('HYPOTHESIS', 'CONCLUSION', 'VERIFICATION') THEN RAISE EXCEPTION 'diagnostic evidence target type is not active yet'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
