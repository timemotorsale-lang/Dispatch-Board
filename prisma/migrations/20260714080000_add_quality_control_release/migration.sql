ALTER TYPE "RepairJobStatus" ADD VALUE IF NOT EXISTS 'QC_PASSED';

CREATE TYPE "QualityInspectionDisposition" AS ENUM ('PASSED','FAILED');
CREATE TYPE "RoadTestOutcome" AS ENUM ('NOT_REQUIRED','PASSED','FAILED');
CREATE TYPE "RepairHandoffDestination" AS ENUM ('CUSTOMER_DELIVERY','INVENTORY_TITLE_OR_MERCHANDISING');

ALTER TABLE "RepairJob"
  ADD COLUMN "qcPassedAt" TIMESTAMP(3),
  ADD COLUMN "qcFailedAt" TIMESTAMP(3);

CREATE TABLE "RepairQualityInspection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "repairJobId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "disposition" "QualityInspectionDisposition" NOT NULL,
  "templateCode" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "templateSnapshot" JSONB NOT NULL,
  "checkResults" JSONB NOT NULL,
  "completionEvidence" JSONB NOT NULL,
  "safetyChecksPassed" BOOLEAN NOT NULL,
  "peerVerificationRequired" BOOLEAN NOT NULL,
  "peerVerificationPassed" BOOLEAN NOT NULL,
  "peerVerifierUserId" TEXT,
  "roadTestRequired" BOOLEAN NOT NULL,
  "roadTestOutcome" "RoadTestOutcome" NOT NULL,
  "roadTestEvidence" JSONB NOT NULL,
  "failureReasonCodes" JSONB NOT NULL,
  "reworkInstructions" TEXT,
  "inspectorUserId" TEXT NOT NULL,
  "inspectedAt" TIMESTAMP(3) NOT NULL,
  "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepairQualityInspection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairQualityInspection_values_check" CHECK (
    "version" > 0 AND "templateVersion" > 0
    AND jsonb_typeof("checkResults") = 'array'
    AND jsonb_typeof("completionEvidence") = 'array'
    AND jsonb_array_length("completionEvidence") > 0
    AND jsonb_typeof("roadTestEvidence") = 'array'
    AND jsonb_typeof("failureReasonCodes") = 'array'
  ),
  CONSTRAINT "RepairQualityInspection_peer_check" CHECK (
    NOT "peerVerificationPassed" OR "peerVerifierUserId" IS NOT NULL
  ),
  CONSTRAINT "RepairQualityInspection_road_test_check" CHECK (
    (NOT "roadTestRequired" AND "roadTestOutcome" = 'NOT_REQUIRED')
    OR ("roadTestRequired" AND "roadTestOutcome" <> 'NOT_REQUIRED')
  ),
  CONSTRAINT "RepairQualityInspection_disposition_check" CHECK (
    ("disposition" = 'PASSED' AND "safetyChecksPassed"
      AND (NOT "peerVerificationRequired" OR "peerVerificationPassed")
      AND (NOT "roadTestRequired" OR "roadTestOutcome" = 'PASSED')
      AND jsonb_array_length("failureReasonCodes") = 0
      AND "reworkInstructions" IS NULL)
    OR
    ("disposition" = 'FAILED'
      AND jsonb_array_length("failureReasonCodes") > 0
      AND length(trim("reworkInstructions")) >= 10)
  )
);

CREATE TABLE "RepairOrderReleaseAuthorization" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "destination" "RepairHandoffDestination" NOT NULL,
  "qcInspectionIds" JSONB NOT NULL,
  "releaseEvidence" JSONB NOT NULL,
  "keysVerified" BOOLEAN NOT NULL,
  "openExceptions" JSONB NOT NULL,
  "authorizedByUserId" TEXT NOT NULL,
  "authorizedAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepairOrderReleaseAuthorization_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairOrderReleaseAuthorization_gate_check" CHECK (
    "keysVerified"
    AND jsonb_typeof("qcInspectionIds") = 'array'
    AND jsonb_array_length("qcInspectionIds") > 0
    AND jsonb_typeof("releaseEvidence") = 'array'
    AND jsonb_array_length("releaseEvidence") > 0
    AND jsonb_typeof("openExceptions") = 'array'
    AND jsonb_array_length("openExceptions") = 0
    AND length(trim("reason")) >= 10
  )
);

CREATE UNIQUE INDEX "RepairQualityInspection_job_version_key" ON "RepairQualityInspection"("repairJobId","version");
CREATE UNIQUE INDEX "RepairQualityInspection_supersedesId_key" ON "RepairQualityInspection"("supersedesId");
CREATE INDEX "RepairQualityInspection_org_disposition_time_idx" ON "RepairQualityInspection"("organizationId","disposition","inspectedAt");
CREATE INDEX "RepairQualityInspection_order_time_idx" ON "RepairQualityInspection"("repairOrderId","inspectedAt");
CREATE UNIQUE INDEX "RepairOrderReleaseAuthorization_repairOrderId_key" ON "RepairOrderReleaseAuthorization"("repairOrderId");
CREATE INDEX "RepairOrderReleaseAuthorization_org_time_idx" ON "RepairOrderReleaseAuthorization"("organizationId","authorizedAt");
CREATE INDEX "RepairOrderReleaseAuthorization_authorizer_time_idx" ON "RepairOrderReleaseAuthorization"("authorizedByUserId","authorizedAt");

ALTER TABLE "RepairQualityInspection" ADD CONSTRAINT "RepairQualityInspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairQualityInspection" ADD CONSTRAINT "RepairQualityInspection_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairQualityInspection" ADD CONSTRAINT "RepairQualityInspection_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairQualityInspection" ADD CONSTRAINT "RepairQualityInspection_inspectorUserId_fkey" FOREIGN KEY ("inspectorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairQualityInspection" ADD CONSTRAINT "RepairQualityInspection_peerVerifierUserId_fkey" FOREIGN KEY ("peerVerifierUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairQualityInspection" ADD CONSTRAINT "RepairQualityInspection_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "RepairQualityInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderReleaseAuthorization" ADD CONSTRAINT "RepairOrderReleaseAuthorization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderReleaseAuthorization" ADD CONSTRAINT "RepairOrderReleaseAuthorization_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderReleaseAuthorization" ADD CONSTRAINT "RepairOrderReleaseAuthorization_authorizedByUserId_fkey" FOREIGN KEY ("authorizedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_quality_release_evidence_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RepairQualityInspection_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairQualityInspection" FOR EACH ROW EXECUTE FUNCTION prevent_quality_release_evidence_mutation();
CREATE TRIGGER "RepairOrderReleaseAuthorization_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairOrderReleaseAuthorization" FOR EACH ROW EXECUTE FUNCTION prevent_quality_release_evidence_mutation();
