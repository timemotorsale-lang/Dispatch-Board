CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT','COMPLETED','SUPERSEDED');
CREATE TYPE "InspectionItemResult" AS ENUM ('PASS','ADVISORY','FAIL','NOT_APPLICABLE');
CREATE TYPE "DiagnosticUncertainty" AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT','PRESENTED','SUPERSEDED','EXPIRED');
CREATE TYPE "AuthorizationDisposition" AS ENUM ('ACCEPTED','DECLINED','DEFERRED','PARTIAL','EXPIRED','REVOKED');
CREATE TYPE "AuthorizationChannel" AS ENUM ('IN_PERSON','PHONE','SMS','EMAIL','INTERNAL','WARRANTY');
CREATE TYPE "RepairJobStatus" AS ENUM ('AUTHORIZED','WAITING_PARTS','READY_FOR_REPAIR','CANCELLED');

ALTER TABLE "RepairOrder" DROP CONSTRAINT "RepairOrder_foundation_stage_check";
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_planning_stage_check" CHECK ("stage" IN ('INTAKE','DIAGNOSIS','ESTIMATE','AUTHORIZATION','READY_FOR_REPAIR') AND "operatingState" IN ('ACTIVE','WAITING','BLOCKED') AND "closedAt" IS NULL);

CREATE TABLE "VehicleInspectionVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" "InspectionStatus" NOT NULL DEFAULT 'COMPLETED', "templateCode" TEXT NOT NULL, "templateVersion" INTEGER NOT NULL,
  "templateSnapshot" JSONB NOT NULL, "items" JSONB NOT NULL, "summary" TEXT NOT NULL, "authorUserId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL, "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "VehicleInspectionVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleInspectionVersion_timeline_check" CHECK ("templateVersion" > 0 AND "version" > 0 AND "completedAt" >= "startedAt")
);
CREATE TABLE "RepairDiagnosisVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "concern" TEXT NOT NULL, "symptoms" JSONB NOT NULL, "tests" JSONB NOT NULL, "evidence" JSONB NOT NULL,
  "cause" TEXT NOT NULL, "uncertainty" "DiagnosticUncertainty" NOT NULL, "recommendation" TEXT NOT NULL,
  "proposedCorrection" TEXT NOT NULL, "technicianUserId" TEXT NOT NULL, "diagnosedAt" TIMESTAMP(3) NOT NULL,
  "supersedesId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepairDiagnosisVersion_pkey" PRIMARY KEY ("id"), CONSTRAINT "RepairDiagnosisVersion_version_check" CHECK ("version" > 0)
);
CREATE TABLE "RepairEstimateVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" "EstimateStatus" NOT NULL DEFAULT 'PRESENTED', "lineItems" JSONB NOT NULL,
  "laborSubtotalCents" INTEGER NOT NULL, "partsSubtotalCents" INTEGER NOT NULL, "feeSubtotalCents" INTEGER NOT NULL,
  "taxCents" INTEGER NOT NULL, "discountCents" INTEGER NOT NULL, "totalCents" INTEGER NOT NULL,
  "taxBoundary" TEXT NOT NULL, "optionGroups" JSONB, "assumptions" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL,
  "presentedAt" TIMESTAMP(3) NOT NULL, "presentationChannel" TEXT NOT NULL, "authorUserId" TEXT NOT NULL,
  "supersedesId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepairEstimateVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairEstimateVersion_totals_check" CHECK ("version" > 0 AND "laborSubtotalCents" >= 0 AND "partsSubtotalCents" >= 0 AND "feeSubtotalCents" >= 0 AND "taxCents" >= 0 AND "discountCents" >= 0 AND "totalCents" = "laborSubtotalCents" + "partsSubtotalCents" + "feeSubtotalCents" + "taxCents" - "discountCents" AND "expiresAt" > "presentedAt")
);
CREATE TABLE "RepairAuthorization" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "estimateVersionId" TEXT NOT NULL,
  "disposition" "AuthorizationDisposition" NOT NULL, "channel" "AuthorizationChannel" NOT NULL,
  "authorizedLineKeys" JSONB NOT NULL, "authorizedAmountCents" INTEGER NOT NULL, "decisionActorType" TEXT NOT NULL,
  "decisionActorName" TEXT NOT NULL, "decisionActorReference" TEXT, "decidedByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "decidedAt" TIMESTAMP(3) NOT NULL, "previousAuthorizationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RepairAuthorization_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairAuthorization_amount_check" CHECK ("authorizedAmountCents" >= 0),
  CONSTRAINT "RepairAuthorization_acceptance_check" CHECK (("disposition" IN ('ACCEPTED','PARTIAL') AND "authorizedAmountCents" > 0) OR ("disposition" NOT IN ('ACCEPTED','PARTIAL') AND "authorizedAmountCents" = 0))
);
CREATE TABLE "RepairJob" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "jobNumber" TEXT NOT NULL,
  "diagnosisVersionId" TEXT, "estimateVersionId" TEXT NOT NULL, "authorizationId" TEXT NOT NULL,
  "authorizedLineKey" TEXT NOT NULL, "workTypeCode" TEXT NOT NULL, "description" TEXT NOT NULL,
  "plannedCorrection" TEXT NOT NULL, "laborGuideMinutes" INTEGER NOT NULL, "requiredSkills" JSONB NOT NULL,
  "requiredCertifications" JSONB NOT NULL, "bayRequirements" JSONB NOT NULL, "toolRequirements" JSONB NOT NULL,
  "priority" TEXT NOT NULL, "dependencyJobIds" JSONB NOT NULL, "partsRequired" BOOLEAN NOT NULL DEFAULT false,
  "status" "RepairJobStatus" NOT NULL DEFAULT 'AUTHORIZED', "readinessReasonCodes" JSONB NOT NULL,
  "authorizedAmountCents" INTEGER NOT NULL, "createdByUserId" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepairJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairJob_values_check" CHECK ("laborGuideMinutes" >= 0 AND "authorizedAmountCents" > 0 AND "version" > 0)
);
ALTER TABLE "RepairPartDemand" ADD COLUMN "repairJobId" TEXT;

CREATE UNIQUE INDEX "VehicleInspectionVersion_repairOrderId_version_key" ON "VehicleInspectionVersion"("repairOrderId","version");
CREATE UNIQUE INDEX "VehicleInspectionVersion_supersedesId_key" ON "VehicleInspectionVersion"("supersedesId");
CREATE INDEX "VehicleInspectionVersion_organizationId_completedAt_idx" ON "VehicleInspectionVersion"("organizationId","completedAt");
CREATE UNIQUE INDEX "RepairDiagnosisVersion_repairOrderId_version_key" ON "RepairDiagnosisVersion"("repairOrderId","version");
CREATE UNIQUE INDEX "RepairDiagnosisVersion_supersedesId_key" ON "RepairDiagnosisVersion"("supersedesId");
CREATE INDEX "RepairDiagnosisVersion_organizationId_diagnosedAt_idx" ON "RepairDiagnosisVersion"("organizationId","diagnosedAt");
CREATE UNIQUE INDEX "RepairEstimateVersion_repairOrderId_version_key" ON "RepairEstimateVersion"("repairOrderId","version");
CREATE UNIQUE INDEX "RepairEstimateVersion_supersedesId_key" ON "RepairEstimateVersion"("supersedesId");
CREATE INDEX "RepairEstimateVersion_organizationId_status_expiresAt_idx" ON "RepairEstimateVersion"("organizationId","status","expiresAt");
CREATE UNIQUE INDEX "RepairAuthorization_previousAuthorizationId_key" ON "RepairAuthorization"("previousAuthorizationId");
CREATE INDEX "RepairAuthorization_repairOrderId_decidedAt_idx" ON "RepairAuthorization"("repairOrderId","decidedAt");
CREATE INDEX "RepairAuthorization_estimateVersionId_disposition_idx" ON "RepairAuthorization"("estimateVersionId","disposition");
CREATE INDEX "RepairAuthorization_organizationId_decidedAt_idx" ON "RepairAuthorization"("organizationId","decidedAt");
CREATE UNIQUE INDEX "RepairJob_repairOrderId_jobNumber_key" ON "RepairJob"("repairOrderId","jobNumber");
CREATE UNIQUE INDEX "RepairJob_authorized_line_key" ON "RepairJob"("repairOrderId","authorizedLineKey","authorizationId");
CREATE UNIQUE INDEX "RepairJob_id_organizationId_key" ON "RepairJob"("id","organizationId");
CREATE INDEX "RepairJob_organizationId_status_priority_idx" ON "RepairJob"("organizationId","status","priority");
CREATE INDEX "RepairJob_repairOrderId_status_idx" ON "RepairJob"("repairOrderId","status");
CREATE INDEX "RepairPartDemand_repairJobId_status_idx" ON "RepairPartDemand"("repairJobId","status");

ALTER TABLE "VehicleInspectionVersion" ADD CONSTRAINT "VehicleInspectionVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInspectionVersion" ADD CONSTRAINT "VehicleInspectionVersion_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInspectionVersion" ADD CONSTRAINT "VehicleInspectionVersion_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInspectionVersion" ADD CONSTRAINT "VehicleInspectionVersion_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "VehicleInspectionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairDiagnosisVersion" ADD CONSTRAINT "RepairDiagnosisVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairDiagnosisVersion" ADD CONSTRAINT "RepairDiagnosisVersion_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairDiagnosisVersion" ADD CONSTRAINT "RepairDiagnosisVersion_technicianUserId_fkey" FOREIGN KEY ("technicianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairDiagnosisVersion" ADD CONSTRAINT "RepairDiagnosisVersion_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "RepairDiagnosisVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairEstimateVersion" ADD CONSTRAINT "RepairEstimateVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairEstimateVersion" ADD CONSTRAINT "RepairEstimateVersion_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairEstimateVersion" ADD CONSTRAINT "RepairEstimateVersion_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairEstimateVersion" ADD CONSTRAINT "RepairEstimateVersion_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "RepairEstimateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairAuthorization" ADD CONSTRAINT "RepairAuthorization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairAuthorization" ADD CONSTRAINT "RepairAuthorization_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairAuthorization" ADD CONSTRAINT "RepairAuthorization_estimateVersionId_fkey" FOREIGN KEY ("estimateVersionId") REFERENCES "RepairEstimateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairAuthorization" ADD CONSTRAINT "RepairAuthorization_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairAuthorization" ADD CONSTRAINT "RepairAuthorization_previousAuthorizationId_fkey" FOREIGN KEY ("previousAuthorizationId") REFERENCES "RepairAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_diagnosisVersionId_fkey" FOREIGN KEY ("diagnosisVersionId") REFERENCES "RepairDiagnosisVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_estimateVersionId_fkey" FOREIGN KEY ("estimateVersionId") REFERENCES "RepairEstimateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "RepairAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairPartDemand" ADD CONSTRAINT "RepairPartDemand_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_shop_planning_evidence_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION '% is immutable', TG_TABLE_NAME; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "VehicleInspectionVersion_prevent_mutation" BEFORE UPDATE OR DELETE ON "VehicleInspectionVersion" FOR EACH ROW EXECUTE FUNCTION prevent_shop_planning_evidence_mutation();
CREATE TRIGGER "RepairDiagnosisVersion_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairDiagnosisVersion" FOR EACH ROW EXECUTE FUNCTION prevent_shop_planning_evidence_mutation();
CREATE TRIGGER "RepairEstimateVersion_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairEstimateVersion" FOR EACH ROW EXECUTE FUNCTION prevent_shop_planning_evidence_mutation();
CREATE TRIGGER "RepairAuthorization_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairAuthorization" FOR EACH ROW EXECUTE FUNCTION prevent_shop_planning_evidence_mutation();
