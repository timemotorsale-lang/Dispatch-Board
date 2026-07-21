CREATE TYPE "DiagnosticFactClass" AS ENUM ('REPORTED', 'OBSERVED', 'MEASURED', 'CALCULATED');
CREATE TYPE "DiagnosticFactSource" AS ENUM ('CUSTOMER', 'TECHNICIAN', 'VEHICLE_SYSTEM', 'TEST_EQUIPMENT', 'IMPORTED_RECORD');
CREATE TYPE "DiagnosticReliability" AS ENUM ('UNASSESSED', 'LOW', 'MEDIUM', 'HIGH', 'VERIFIED');
CREATE TYPE "DiagnosticQualityStatus" AS ENUM ('VALID', 'SUSPECT', 'INVALID');
CREATE TYPE "DiagnosticPlausibilityStatus" AS ENUM ('PLAUSIBLE', 'OUT_OF_RANGE', 'NOT_EVALUATED');
CREATE TYPE "DiagnosticEvidenceSubjectType" AS ENUM ('CASE', 'CONCERN', 'OBSERVATION', 'MEASUREMENT', 'TEST_EXECUTION', 'HYPOTHESIS', 'CONCLUSION', 'VERIFICATION');

CREATE UNIQUE INDEX "DiagnosticConcernVersion_id_organizationId_key" ON "DiagnosticConcernVersion"("id", "organizationId");

CREATE TABLE "DiagnosticObservation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "diagnosticCaseId" TEXT NOT NULL,
  "concernVersionId" TEXT NOT NULL,
  "factClass" "DiagnosticFactClass" NOT NULL,
  "statement" TEXT NOT NULL,
  "structuredValue" JSONB,
  "operatingConditions" JSONB NOT NULL,
  "source" "DiagnosticFactSource" NOT NULL,
  "reliability" "DiagnosticReliability" NOT NULL DEFAULT 'UNASSESSED',
  "qualityStatus" "DiagnosticQualityStatus" NOT NULL DEFAULT 'VALID',
  "qualityReasonCode" TEXT NOT NULL,
  "independenceGroup" TEXT NOT NULL,
  "timeWindowStart" TIMESTAMP(3) NOT NULL,
  "timeWindowEnd" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "rawSource" JSONB NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "correctsId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticObservation_content_check" CHECK (BTRIM("statement") <> '' AND BTRIM("qualityReasonCode") <> '' AND BTRIM("independenceGroup") <> '' AND "factClass" <> 'MEASURED'),
  CONSTRAINT "DiagnosticObservation_time_window_check" CHECK ("timeWindowStart" <= "observedAt" AND "observedAt" <= "timeWindowEnd")
);

CREATE TABLE "DiagnosticMeasurement" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "diagnosticCaseId" TEXT NOT NULL,
  "concernVersionId" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "valueDecimal" DECIMAL(24,8) NOT NULL,
  "unit" TEXT NOT NULL,
  "normalizedValue" DECIMAL(24,8) NOT NULL,
  "normalizedUnit" TEXT NOT NULL,
  "referenceMinimum" DECIMAL(24,8),
  "referenceMaximum" DECIMAL(24,8),
  "normalizedReferenceMin" DECIMAL(24,8),
  "normalizedReferenceMax" DECIMAL(24,8),
  "tolerance" JSONB NOT NULL,
  "instrument" JSONB NOT NULL,
  "setup" JSONB NOT NULL,
  "operatingConditions" JSONB NOT NULL,
  "source" "DiagnosticFactSource" NOT NULL,
  "reliability" "DiagnosticReliability" NOT NULL DEFAULT 'UNASSESSED',
  "qualityStatus" "DiagnosticQualityStatus" NOT NULL DEFAULT 'VALID',
  "qualityReasonCode" TEXT NOT NULL,
  "plausibilityStatus" "DiagnosticPlausibilityStatus" NOT NULL,
  "plausibilityReasonCode" TEXT NOT NULL,
  "independenceGroup" TEXT NOT NULL,
  "timeWindowStart" TIMESTAMP(3) NOT NULL,
  "timeWindowEnd" TIMESTAMP(3) NOT NULL,
  "measuredAt" TIMESTAMP(3) NOT NULL,
  "rawSource" JSONB NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticMeasurement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticMeasurement_content_check" CHECK (BTRIM("quantity") <> '' AND BTRIM("unit") <> '' AND BTRIM("normalizedUnit") <> '' AND BTRIM("qualityReasonCode") <> '' AND BTRIM("plausibilityReasonCode") <> '' AND BTRIM("independenceGroup") <> ''),
  CONSTRAINT "DiagnosticMeasurement_time_window_check" CHECK ("timeWindowStart" <= "measuredAt" AND "measuredAt" <= "timeWindowEnd"),
  CONSTRAINT "DiagnosticMeasurement_reference_check" CHECK (("referenceMinimum" IS NULL OR "referenceMaximum" IS NULL OR "referenceMinimum" <= "referenceMaximum") AND ("normalizedReferenceMin" IS NULL OR "normalizedReferenceMax" IS NULL OR "normalizedReferenceMin" <= "normalizedReferenceMax")),
  CONSTRAINT "DiagnosticMeasurement_plausibility_quality_check" CHECK ("plausibilityStatus" <> 'OUT_OF_RANGE' OR "qualityStatus" = 'INVALID')
);

CREATE TABLE "DiagnosticEvidenceLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "diagnosticCaseId" TEXT NOT NULL,
  "evidenceObjectId" TEXT NOT NULL,
  "subjectType" "DiagnosticEvidenceSubjectType" NOT NULL,
  "subjectId" TEXT NOT NULL,
  "observationId" TEXT,
  "measurementId" TEXT,
  "purpose" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticEvidenceLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticEvidenceLink_content_check" CHECK (BTRIM("subjectId") <> '' AND BTRIM("purpose") <> '' AND BTRIM("relationship") <> ''),
  CONSTRAINT "DiagnosticEvidenceLink_typed_target_check" CHECK (
    ("subjectType" = 'OBSERVATION' AND "observationId" = "subjectId" AND "measurementId" IS NULL) OR
    ("subjectType" = 'MEASUREMENT' AND "measurementId" = "subjectId" AND "observationId" IS NULL) OR
    ("subjectType" NOT IN ('OBSERVATION', 'MEASUREMENT') AND "observationId" IS NULL AND "measurementId" IS NULL)
  )
);

CREATE UNIQUE INDEX "DiagnosticObservation_id_organizationId_key" ON "DiagnosticObservation"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticObservation_correctsId_key" ON "DiagnosticObservation"("correctsId");
CREATE INDEX "DiagnosticObservation_diagnosticCaseId_observedAt_idx" ON "DiagnosticObservation"("diagnosticCaseId", "observedAt");
CREATE INDEX "DiagnosticObservation_organizationId_qualityStatus_createdAt_idx" ON "DiagnosticObservation"("organizationId", "qualityStatus", "createdAt");
CREATE INDEX "DiagnosticObservation_independenceGroup_observedAt_idx" ON "DiagnosticObservation"("independenceGroup", "observedAt");

CREATE UNIQUE INDEX "DiagnosticMeasurement_id_organizationId_key" ON "DiagnosticMeasurement"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticMeasurement_supersedesId_key" ON "DiagnosticMeasurement"("supersedesId");
CREATE INDEX "DiagnosticMeasurement_diagnosticCaseId_measuredAt_idx" ON "DiagnosticMeasurement"("diagnosticCaseId", "measuredAt");
CREATE INDEX "DiagnosticMeasurement_organizationId_qualityStatus_createdAt_idx" ON "DiagnosticMeasurement"("organizationId", "qualityStatus", "createdAt");
CREATE INDEX "DiagnosticMeasurement_quantity_normalizedUnit_measuredAt_idx" ON "DiagnosticMeasurement"("quantity", "normalizedUnit", "measuredAt");
CREATE INDEX "DiagnosticMeasurement_independenceGroup_measuredAt_idx" ON "DiagnosticMeasurement"("independenceGroup", "measuredAt");

CREATE UNIQUE INDEX "DiagnosticEvidenceLink_evidenceObjectId_diagnosticCaseId_subjectType_subjectId_relationship_key" ON "DiagnosticEvidenceLink"("evidenceObjectId", "diagnosticCaseId", "subjectType", "subjectId", "relationship");
CREATE UNIQUE INDEX "DiagnosticEvidenceLink_id_organizationId_key" ON "DiagnosticEvidenceLink"("id", "organizationId");
CREATE INDEX "DiagnosticEvidenceLink_diagnosticCaseId_createdAt_idx" ON "DiagnosticEvidenceLink"("diagnosticCaseId", "createdAt");
CREATE INDEX "DiagnosticEvidenceLink_organizationId_evidenceObjectId_idx" ON "DiagnosticEvidenceLink"("organizationId", "evidenceObjectId");
CREATE INDEX "DiagnosticEvidenceLink_subjectType_subjectId_idx" ON "DiagnosticEvidenceLink"("subjectType", "subjectId");

ALTER TABLE "DiagnosticObservation" ADD CONSTRAINT "DiagnosticObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticObservation" ADD CONSTRAINT "DiagnosticObservation_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticObservation" ADD CONSTRAINT "DiagnosticObservation_concern_tenant_fkey" FOREIGN KEY ("concernVersionId", "organizationId") REFERENCES "DiagnosticConcernVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticObservation" ADD CONSTRAINT "DiagnosticObservation_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticObservation" ADD CONSTRAINT "DiagnosticObservation_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "DiagnosticObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiagnosticMeasurement" ADD CONSTRAINT "DiagnosticMeasurement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticMeasurement" ADD CONSTRAINT "DiagnosticMeasurement_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticMeasurement" ADD CONSTRAINT "DiagnosticMeasurement_concern_tenant_fkey" FOREIGN KEY ("concernVersionId", "organizationId") REFERENCES "DiagnosticConcernVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticMeasurement" ADD CONSTRAINT "DiagnosticMeasurement_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticMeasurement" ADD CONSTRAINT "DiagnosticMeasurement_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticMeasurement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiagnosticEvidenceLink" ADD CONSTRAINT "DiagnosticEvidenceLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEvidenceLink" ADD CONSTRAINT "DiagnosticEvidenceLink_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEvidenceLink" ADD CONSTRAINT "DiagnosticEvidenceLink_evidence_tenant_fkey" FOREIGN KEY ("evidenceObjectId", "organizationId") REFERENCES "VehicleEvidenceObject"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEvidenceLink" ADD CONSTRAINT "DiagnosticEvidenceLink_observation_tenant_fkey" FOREIGN KEY ("observationId", "organizationId") REFERENCES "DiagnosticObservation"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEvidenceLink" ADD CONSTRAINT "DiagnosticEvidenceLink_measurement_tenant_fkey" FOREIGN KEY ("measurementId", "organizationId") REFERENCES "DiagnosticMeasurement"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticEvidenceLink" ADD CONSTRAINT "DiagnosticEvidenceLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_fact_lineage() RETURNS trigger AS $$
DECLARE
  prior_case TEXT;
  prior_org TEXT;
BEGIN
  IF TG_TABLE_NAME = 'DiagnosticObservation' AND NEW."correctsId" IS NOT NULL THEN
    SELECT "diagnosticCaseId", "organizationId" INTO prior_case, prior_org FROM "DiagnosticObservation" WHERE "id" = NEW."correctsId";
  ELSIF TG_TABLE_NAME = 'DiagnosticMeasurement' AND NEW."supersedesId" IS NOT NULL THEN
    SELECT "diagnosticCaseId", "organizationId" INTO prior_case, prior_org FROM "DiagnosticMeasurement" WHERE "id" = NEW."supersedesId";
  ELSE
    RETURN NEW;
  END IF;
  IF prior_case IS NULL OR prior_case <> NEW."diagnosticCaseId" OR prior_org <> NEW."organizationId" THEN
    RAISE EXCEPTION 'diagnostic fact correction lineage must remain within one tenant and case';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION validate_diagnostic_evidence_link() RETURNS trigger AS $$
DECLARE
  case_vehicle TEXT;
  evidence_status "VehicleEvidenceStatus";
  malware_status "VehicleEvidenceMalwareStatus";
BEGIN
  SELECT "vehicleId" INTO case_vehicle FROM "DiagnosticCase" WHERE "id" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId";
  SELECT "status", "malwareStatus" INTO evidence_status, malware_status FROM "VehicleEvidenceObject" WHERE "id" = NEW."evidenceObjectId" AND "organizationId" = NEW."organizationId";
  IF case_vehicle IS NULL OR evidence_status IS NULL THEN RAISE EXCEPTION 'diagnostic evidence tenant or case integrity failed'; END IF;
  IF evidence_status <> 'AVAILABLE' OR malware_status <> 'CLEAN' THEN RAISE EXCEPTION 'diagnostic evidence must be available and malware-clean'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "VehicleEvidenceLink" WHERE "organizationId" = NEW."organizationId" AND "evidenceObjectId" = NEW."evidenceObjectId" AND "vehicleId" = case_vehicle) THEN
    RAISE EXCEPTION 'diagnostic evidence must belong to the case vehicle';
  END IF;
  IF NEW."subjectType" = 'CASE' AND NEW."subjectId" <> NEW."diagnosticCaseId" THEN RAISE EXCEPTION 'case evidence target is invalid'; END IF;
  IF NEW."subjectType" = 'CONCERN' AND NOT EXISTS (SELECT 1 FROM "DiagnosticConcernVersion" WHERE "id" = NEW."subjectId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'concern evidence target is invalid'; END IF;
  IF NEW."subjectType" = 'OBSERVATION' AND NOT EXISTS (SELECT 1 FROM "DiagnosticObservation" WHERE "id" = NEW."subjectId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'observation evidence target is invalid'; END IF;
  IF NEW."subjectType" = 'MEASUREMENT' AND NOT EXISTS (SELECT 1 FROM "DiagnosticMeasurement" WHERE "id" = NEW."subjectId" AND "diagnosticCaseId" = NEW."diagnosticCaseId" AND "organizationId" = NEW."organizationId") THEN RAISE EXCEPTION 'measurement evidence target is invalid'; END IF;
  IF NEW."subjectType" IN ('TEST_EXECUTION', 'HYPOTHESIS', 'CONCLUSION', 'VERIFICATION') THEN RAISE EXCEPTION 'diagnostic evidence target type is not active yet'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticObservation_lineage" BEFORE INSERT ON "DiagnosticObservation" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_fact_lineage();
CREATE TRIGGER "DiagnosticMeasurement_lineage" BEFORE INSERT ON "DiagnosticMeasurement" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_fact_lineage();
CREATE TRIGGER "DiagnosticEvidenceLink_validate" BEFORE INSERT ON "DiagnosticEvidenceLink" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_evidence_link();
CREATE TRIGGER "DiagnosticObservation_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticObservation" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticMeasurement_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticMeasurement" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticEvidenceLink_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticEvidenceLink" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
