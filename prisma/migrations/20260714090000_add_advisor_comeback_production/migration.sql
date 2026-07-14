CREATE TYPE "AdvisorContactChannel" AS ENUM ('IN_PERSON','PHONE','SMS','EMAIL','INTERNAL');
CREATE TYPE "AdvisorContactDirection" AS ENUM ('INBOUND','OUTBOUND','INTERNAL');
CREATE TYPE "DeliveryReadinessDisposition" AS ENUM ('READY','BLOCKED');
CREATE TYPE "ComebackStatus" AS ENUM ('OPEN','REVIEWING','RESOLVED','CLOSED');
CREATE TYPE "ComebackResponsibility" AS ENUM ('UNDETERMINED','DEALERSHIP','WARRANTY','CUSTOMER','VENDOR');
CREATE TYPE "ProductionConfidence" AS ENUM ('HIGH','MEDIUM','LOW');

CREATE TABLE "RepairAdvisorUpdate" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"repairOrderId" TEXT NOT NULL,"version" INTEGER NOT NULL,
 "statusCode" TEXT NOT NULL,"promiseAt" TIMESTAMP(3),"contactChannel" "AdvisorContactChannel" NOT NULL,
 "contactDirection" "AdvisorContactDirection" NOT NULL,"contactOutcome" TEXT NOT NULL,"customerVisibleSummary" TEXT NOT NULL,
 "internalNotes" TEXT,"exceptionCodes" JSONB NOT NULL,"nextContactAt" TIMESTAMP(3),"authorUserId" TEXT NOT NULL,
 "reason" TEXT NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RepairAdvisorUpdate_pkey" PRIMARY KEY("id"),
 CONSTRAINT "RepairAdvisorUpdate_values_check" CHECK ("version">0 AND length(trim("statusCode"))>0 AND length(trim("contactOutcome"))>0 AND length(trim("customerVisibleSummary"))>0 AND length(trim("reason"))>=10 AND jsonb_typeof("exceptionCodes")='array')
);
CREATE TABLE "RepairDeliveryReadinessEvaluation" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"repairOrderId" TEXT NOT NULL,"version" INTEGER NOT NULL,
 "disposition" "DeliveryReadinessDisposition" NOT NULL,"checks" JSONB NOT NULL,"blockerCodes" JSONB NOT NULL,
 "releaseAuthorizationId" TEXT,"promisedDeliveryAt" TIMESTAMP(3),"evaluatorUserId" TEXT NOT NULL,"reason" TEXT NOT NULL,
 "evaluatedAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RepairDeliveryReadinessEvaluation_pkey" PRIMARY KEY("id"),
 CONSTRAINT "RepairDeliveryReadiness_values_check" CHECK ("version">0 AND jsonb_typeof("checks")='array' AND jsonb_array_length("checks")>0 AND jsonb_typeof("blockerCodes")='array' AND length(trim("reason"))>=10),
 CONSTRAINT "RepairDeliveryReadiness_disposition_check" CHECK (("disposition"='READY' AND jsonb_array_length("blockerCodes")=0 AND "releaseAuthorizationId" IS NOT NULL) OR ("disposition"='BLOCKED' AND jsonb_array_length("blockerCodes")>0))
);
CREATE TABLE "RepairComebackCase" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"originalRepairOrderId" TEXT NOT NULL,"originalRepairJobId" TEXT NOT NULL,
 "followUpRepairOrderId" TEXT,"caseNumber" TEXT NOT NULL,"status" "ComebackStatus" NOT NULL DEFAULT 'OPEN',
 "reportedConcern" TEXT NOT NULL,"reasonCategory" TEXT NOT NULL,"responsibility" "ComebackResponsibility" NOT NULL DEFAULT 'UNDETERMINED',
 "estimatedCostCents" INTEGER NOT NULL DEFAULT 0,"actualCostCents" INTEGER,"resolutionOutcome" TEXT,"followUpDueAt" TIMESTAMP(3) NOT NULL,
 "followUpCompletedAt" TIMESTAMP(3),"createdByUserId" TEXT NOT NULL,"resolvedByUserId" TEXT,"reportedAt" TIMESTAMP(3) NOT NULL,
 "resolvedAt" TIMESTAMP(3),"disciplinaryUseProhibited" BOOLEAN NOT NULL DEFAULT true,"version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RepairComebackCase_pkey" PRIMARY KEY("id"),
 CONSTRAINT "RepairComebackCase_values_check" CHECK ("version">0 AND "estimatedCostCents">=0 AND ("actualCostCents" IS NULL OR "actualCostCents">=0) AND "disciplinaryUseProhibited" AND length(trim("reportedConcern"))>=10),
 CONSTRAINT "RepairComebackCase_resolution_check" CHECK (("status" IN ('OPEN','REVIEWING') AND "resolvedAt" IS NULL AND "resolvedByUserId" IS NULL) OR ("status" IN ('RESOLVED','CLOSED') AND "resolvedAt" IS NOT NULL AND "resolvedByUserId" IS NOT NULL AND "actualCostCents" IS NOT NULL AND length(trim("resolutionOutcome"))>=10))
);
CREATE TABLE "RepairComebackEvent" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"comebackCaseId" TEXT NOT NULL,"version" INTEGER NOT NULL,
 "fromStatus" "ComebackStatus","toStatus" "ComebackStatus" NOT NULL,"responsibility" "ComebackResponsibility" NOT NULL,
 "actualCostCents" INTEGER,"outcome" TEXT,"reason" TEXT NOT NULL,"actorUserId" TEXT NOT NULL,"correlationId" TEXT NOT NULL,
 "occurredAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RepairComebackEvent_pkey" PRIMARY KEY("id"),
 CONSTRAINT "RepairComebackEvent_values_check" CHECK ("version">0 AND ("actualCostCents" IS NULL OR "actualCostCents">=0) AND length(trim("reason"))>=10)
);
CREATE TABLE "TechnicianPresenceRecord" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"locationId" TEXT NOT NULL,"technicianUserId" TEXT NOT NULL,
 "startsAt" TIMESTAMP(3) NOT NULL,"endsAt" TIMESTAMP(3) NOT NULL,"approvedNonProductiveMinutes" INTEGER NOT NULL DEFAULT 0,
 "idleCauseCode" TEXT,"sourceCode" TEXT NOT NULL,"sourceReference" TEXT,"recordedByUserId" TEXT NOT NULL,"reason" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "TechnicianPresenceRecord_pkey" PRIMARY KEY("id"),
 CONSTRAINT "TechnicianPresenceRecord_values_check" CHECK ("endsAt">"startsAt" AND "approvedNonProductiveMinutes">=0 AND "approvedNonProductiveMinutes"<=round(extract(epoch from ("endsAt"-"startsAt"))/60) AND length(trim("sourceCode"))>0 AND length(trim("reason"))>=10)
);
CREATE TABLE "ShopProductionSnapshot" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"locationId" TEXT NOT NULL,"technicianUserId" TEXT NOT NULL,
 "windowStart" TIMESTAMP(3) NOT NULL,"windowEnd" TIMESTAMP(3) NOT NULL,"presentMinutes" INTEGER NOT NULL,"repairClockedMinutes" INTEGER NOT NULL,
 "earnedMinutes" INTEGER NOT NULL,"nonComebackEarnedMinutes" INTEGER NOT NULL,"approvedNonProductiveMinutes" INTEGER NOT NULL,
 "idleCauseMinutes" JSONB NOT NULL,"productivityBasisPoints" INTEGER NOT NULL,"efficiencyBasisPoints" INTEGER NOT NULL,
 "proficiencyBasisPoints" INTEGER NOT NULL,"firstPassYieldBasisPoints" INTEGER NOT NULL,"qualityAdjustedBasisPoints" INTEGER NOT NULL,
 "confidence" "ProductionConfidence" NOT NULL,"reasonCodes" JSONB NOT NULL,"sourceFingerprint" TEXT NOT NULL,
 "generatedByUserId" TEXT NOT NULL,"calculatedAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ShopProductionSnapshot_pkey" PRIMARY KEY("id"),
 CONSTRAINT "ShopProductionSnapshot_values_check" CHECK ("windowEnd">"windowStart" AND "presentMinutes">=0 AND "repairClockedMinutes">=0 AND "earnedMinutes">=0 AND "nonComebackEarnedMinutes">=0 AND "nonComebackEarnedMinutes"<="earnedMinutes" AND "approvedNonProductiveMinutes">=0 AND jsonb_typeof("idleCauseMinutes")='object' AND jsonb_typeof("reasonCodes")='array' AND length("sourceFingerprint")=64)
);

CREATE UNIQUE INDEX "RepairAdvisorUpdate_order_version_key" ON "RepairAdvisorUpdate"("repairOrderId","version");
CREATE INDEX "RepairAdvisorUpdate_org_status_time_idx" ON "RepairAdvisorUpdate"("organizationId","statusCode","occurredAt");
CREATE INDEX "RepairAdvisorUpdate_order_time_idx" ON "RepairAdvisorUpdate"("repairOrderId","occurredAt");
CREATE UNIQUE INDEX "RepairDeliveryReadiness_order_version_key" ON "RepairDeliveryReadinessEvaluation"("repairOrderId","version");
CREATE INDEX "RepairDeliveryReadiness_org_disposition_idx" ON "RepairDeliveryReadinessEvaluation"("organizationId","disposition","evaluatedAt");
CREATE UNIQUE INDEX "RepairComebackCase_org_number_key" ON "RepairComebackCase"("organizationId","caseNumber");
CREATE INDEX "RepairComebackCase_org_status_due_idx" ON "RepairComebackCase"("organizationId","status","followUpDueAt");
CREATE INDEX "RepairComebackCase_job_reported_idx" ON "RepairComebackCase"("originalRepairJobId","reportedAt");
CREATE UNIQUE INDEX "RepairComebackEvent_case_version_key" ON "RepairComebackEvent"("comebackCaseId","version");
CREATE INDEX "RepairComebackEvent_org_time_idx" ON "RepairComebackEvent"("organizationId","occurredAt");
CREATE UNIQUE INDEX "TechnicianPresenceRecord_source_key" ON "TechnicianPresenceRecord"("organizationId","sourceCode","sourceReference");
CREATE INDEX "TechnicianPresenceRecord_tech_window_idx" ON "TechnicianPresenceRecord"("technicianUserId","startsAt","endsAt");
CREATE INDEX "TechnicianPresenceRecord_org_location_idx" ON "TechnicianPresenceRecord"("organizationId","locationId","startsAt");
CREATE UNIQUE INDEX "ShopProductionSnapshot_identity_key" ON "ShopProductionSnapshot"("organizationId","locationId","technicianUserId","windowStart","windowEnd","sourceFingerprint");
CREATE INDEX "ShopProductionSnapshot_org_location_idx" ON "ShopProductionSnapshot"("organizationId","locationId","windowEnd");
CREATE INDEX "ShopProductionSnapshot_tech_idx" ON "ShopProductionSnapshot"("technicianUserId","windowEnd");

ALTER TABLE "RepairAdvisorUpdate" ADD CONSTRAINT "RepairAdvisorUpdate_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairAdvisorUpdate" ADD CONSTRAINT "RepairAdvisorUpdate_repairOrderId_fkey" FOREIGN KEY("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairAdvisorUpdate" ADD CONSTRAINT "RepairAdvisorUpdate_authorUserId_fkey" FOREIGN KEY("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairDeliveryReadinessEvaluation" ADD CONSTRAINT "RepairDeliveryReadiness_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairDeliveryReadinessEvaluation" ADD CONSTRAINT "RepairDeliveryReadiness_repairOrderId_fkey" FOREIGN KEY("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairDeliveryReadinessEvaluation" ADD CONSTRAINT "RepairDeliveryReadiness_evaluatorUserId_fkey" FOREIGN KEY("evaluatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackCase" ADD CONSTRAINT "RepairComebackCase_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackCase" ADD CONSTRAINT "RepairComebackCase_originalOrder_fkey" FOREIGN KEY("originalRepairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackCase" ADD CONSTRAINT "RepairComebackCase_originalJob_fkey" FOREIGN KEY("originalRepairJobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackCase" ADD CONSTRAINT "RepairComebackCase_followUpOrder_fkey" FOREIGN KEY("followUpRepairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackCase" ADD CONSTRAINT "RepairComebackCase_createdBy_fkey" FOREIGN KEY("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackCase" ADD CONSTRAINT "RepairComebackCase_resolvedBy_fkey" FOREIGN KEY("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackEvent" ADD CONSTRAINT "RepairComebackEvent_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackEvent" ADD CONSTRAINT "RepairComebackEvent_case_fkey" FOREIGN KEY("comebackCaseId") REFERENCES "RepairComebackCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairComebackEvent" ADD CONSTRAINT "RepairComebackEvent_actor_fkey" FOREIGN KEY("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianPresenceRecord" ADD CONSTRAINT "TechnicianPresenceRecord_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianPresenceRecord" ADD CONSTRAINT "TechnicianPresenceRecord_locationId_fkey" FOREIGN KEY("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianPresenceRecord" ADD CONSTRAINT "TechnicianPresenceRecord_technician_fkey" FOREIGN KEY("technicianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianPresenceRecord" ADD CONSTRAINT "TechnicianPresenceRecord_recordedBy_fkey" FOREIGN KEY("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopProductionSnapshot" ADD CONSTRAINT "ShopProductionSnapshot_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopProductionSnapshot" ADD CONSTRAINT "ShopProductionSnapshot_locationId_fkey" FOREIGN KEY("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopProductionSnapshot" ADD CONSTRAINT "ShopProductionSnapshot_technician_fkey" FOREIGN KEY("technicianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopProductionSnapshot" ADD CONSTRAINT "ShopProductionSnapshot_generatedBy_fkey" FOREIGN KEY("generatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_shop_completion_evidence_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION '% is immutable',TG_TABLE_NAME; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "RepairAdvisorUpdate_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairAdvisorUpdate" FOR EACH ROW EXECUTE FUNCTION prevent_shop_completion_evidence_mutation();
CREATE TRIGGER "RepairDeliveryReadiness_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairDeliveryReadinessEvaluation" FOR EACH ROW EXECUTE FUNCTION prevent_shop_completion_evidence_mutation();
CREATE TRIGGER "RepairComebackEvent_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairComebackEvent" FOR EACH ROW EXECUTE FUNCTION prevent_shop_completion_evidence_mutation();
CREATE TRIGGER "TechnicianPresenceRecord_prevent_mutation" BEFORE UPDATE OR DELETE ON "TechnicianPresenceRecord" FOR EACH ROW EXECUTE FUNCTION prevent_shop_completion_evidence_mutation();
CREATE TRIGGER "ShopProductionSnapshot_prevent_mutation" BEFORE UPDATE OR DELETE ON "ShopProductionSnapshot" FOR EACH ROW EXECUTE FUNCTION prevent_shop_completion_evidence_mutation();
