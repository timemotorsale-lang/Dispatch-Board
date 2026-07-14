ALTER TYPE "RepairJobStatus" ADD VALUE IF NOT EXISTS 'DISPATCHED';
ALTER TYPE "RepairJobStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "RepairJobStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "RepairJobStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_QC';
CREATE TYPE "WorkProcedureStatus" AS ENUM ('DRAFT','ACTIVE','RETIRED');
CREATE TYPE "TechnicianQualificationType" AS ENUM ('SKILL','CERTIFICATION');
CREATE TYPE "ShopWorkLane" AS ENUM ('FAST_TRACK','STANDARD_REPAIR','DIAGNOSTIC_HEAVY');
CREATE TYPE "ShopDispatchPosition" AS ENUM ('CURRENT','NEXT');
CREATE TYPE "ShopDispatchStatus" AS ENUM ('STAGED','ACTIVE','REASSIGNED','COMPLETED','CANCELLED');
CREATE TYPE "LaborClockState" AS ENUM ('NOT_STARTED','RUNNING','PAUSED','FINISHED');
CREATE TYPE "LaborEventType" AS ENUM ('START','PAUSE','RESUME','FINISH','CORRECTION');

ALTER TABLE "RepairJob" ADD COLUMN "procedureVersionId" TEXT, ADD COLUMN "lane" "ShopWorkLane",
ADD COLUMN "priorityScore" INTEGER, ADD COLUMN "priorityReasonCodes" JSONB, ADD COLUMN "dispatchedAt" TIMESTAMP(3),
ADD COLUMN "executionStartedAt" TIMESTAMP(3), ADD COLUMN "readyForQcAt" TIMESTAMP(3);
ALTER TABLE "RepairJob" ADD COLUMN "executionEvidence" JSONB, ADD COLUMN "executionBlockerReason" TEXT, ADD COLUMN "qcHandoffNotes" TEXT;

CREATE TABLE "WorkProcedureVersion" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"workTypeCode" TEXT NOT NULL,"version" INTEGER NOT NULL,
 "status" "WorkProcedureStatus" NOT NULL DEFAULT 'ACTIVE',"title" TEXT NOT NULL,"instructions" JSONB NOT NULL,
 "safetySteps" JSONB NOT NULL,"requiredEvidence" JSONB NOT NULL,"qcRules" JSONB NOT NULL,"standardMinutes" INTEGER NOT NULL,
 "effectiveFrom" TIMESTAMP(3) NOT NULL,"effectiveTo" TIMESTAMP(3),"supersedesId" TEXT,"createdByUserId" TEXT NOT NULL,
 "reason" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WorkProcedureVersion_pkey" PRIMARY KEY("id"),
 CONSTRAINT "WorkProcedureVersion_values_check" CHECK ("version">0 AND "standardMinutes">=0 AND ("effectiveTo" IS NULL OR "effectiveTo">"effectiveFrom"))
);
CREATE TABLE "TechnicianQualification" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"technicianUserId" TEXT NOT NULL,
 "type" "TechnicianQualificationType" NOT NULL,"code" TEXT NOT NULL,"effectiveFrom" TIMESTAMP(3) NOT NULL,
 "effectiveTo" TIMESTAMP(3),"sourceReference" TEXT NOT NULL,"verifiedByUserId" TEXT NOT NULL,
 "verifiedAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "TechnicianQualification_pkey" PRIMARY KEY("id"),
 CONSTRAINT "TechnicianQualification_timeline_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo">"effectiveFrom")
);
CREATE TABLE "RepairJobDispatch" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"locationId" TEXT NOT NULL,"repairJobId" TEXT NOT NULL,
 "technicianUserId" TEXT NOT NULL,"bayResourceId" TEXT,"resourceIds" JSONB NOT NULL,
 "position" "ShopDispatchPosition" NOT NULL,"status" "ShopDispatchStatus" NOT NULL,
 "scheduledStartAt" TIMESTAMP(3) NOT NULL,"scheduledEndAt" TIMESTAMP(3) NOT NULL,"assignedByUserId" TEXT NOT NULL,
 "reason" TEXT NOT NULL,"overrideReason" TEXT,"conflictSnapshot" JSONB NOT NULL,"supersedesId" TEXT,
 "version" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RepairJobDispatch_pkey" PRIMARY KEY("id"),
 CONSTRAINT "RepairJobDispatch_timeline_check" CHECK ("scheduledEndAt">"scheduledStartAt" AND "version">0),
 CONSTRAINT "RepairJobDispatch_override_check" CHECK ("overrideReason" IS NULL OR length(trim("overrideReason"))>=10)
);
CREATE TABLE "RepairJobLaborClock" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"repairJobId" TEXT NOT NULL,"technicianUserId" TEXT NOT NULL,
 "state" "LaborClockState" NOT NULL DEFAULT 'NOT_STARTED',"startedAt" TIMESTAMP(3),"lastResumedAt" TIMESTAMP(3),
 "accumulatedMinutes" INTEGER NOT NULL DEFAULT 0,"finishedAt" TIMESTAMP(3),"version" INTEGER NOT NULL DEFAULT 0,
 "updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "RepairJobLaborClock_pkey" PRIMARY KEY("id"),
 CONSTRAINT "RepairJobLaborClock_values_check" CHECK ("accumulatedMinutes">=0 AND "version">=0)
);
CREATE TABLE "RepairJobLaborEvent" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"repairJobId" TEXT NOT NULL,"technicianUserId" TEXT NOT NULL,
 "eventType" "LaborEventType" NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL,"reason" TEXT NOT NULL,
 "correctionMinutes" INTEGER,"approvedNonProductiveCode" TEXT,"actorUserId" TEXT NOT NULL,"correlationId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "RepairJobLaborEvent_pkey" PRIMARY KEY("id"),
 CONSTRAINT "RepairJobLaborEvent_reason_check" CHECK (length(trim("reason"))>=10),
 CONSTRAINT "RepairJobLaborEvent_correction_check" CHECK (("eventType"='CORRECTION' AND "correctionMinutes" IS NOT NULL AND "correctionMinutes"<>0) OR ("eventType"<>'CORRECTION' AND "correctionMinutes" IS NULL))
);

CREATE UNIQUE INDEX "WorkProcedureVersion_org_work_version_key" ON "WorkProcedureVersion"("organizationId","workTypeCode","version");
CREATE UNIQUE INDEX "WorkProcedureVersion_supersedesId_key" ON "WorkProcedureVersion"("supersedesId");
CREATE INDEX "WorkProcedureVersion_active_idx" ON "WorkProcedureVersion"("organizationId","status","effectiveFrom","effectiveTo");
CREATE UNIQUE INDEX "TechnicianQualification_identity_key" ON "TechnicianQualification"("organizationId","technicianUserId","type","code","effectiveFrom");
CREATE INDEX "TechnicianQualification_lookup_idx" ON "TechnicianQualification"("organizationId","type","code","effectiveTo");
CREATE INDEX "TechnicianQualification_user_idx" ON "TechnicianQualification"("technicianUserId","effectiveFrom","effectiveTo");
CREATE UNIQUE INDEX "RepairJobDispatch_supersedesId_key" ON "RepairJobDispatch"("supersedesId");
CREATE INDEX "RepairJobDispatch_board_idx" ON "RepairJobDispatch"("organizationId","locationId","status","scheduledStartAt");
CREATE INDEX "RepairJobDispatch_technician_idx" ON "RepairJobDispatch"("technicianUserId","status","position");
CREATE INDEX "RepairJobDispatch_job_idx" ON "RepairJobDispatch"("repairJobId","status");
CREATE INDEX "RepairJobDispatch_bay_idx" ON "RepairJobDispatch"("bayResourceId","scheduledStartAt","scheduledEndAt");
CREATE UNIQUE INDEX "RepairJobDispatch_one_open_job_key" ON "RepairJobDispatch"("repairJobId") WHERE "status" IN ('STAGED','ACTIVE');
CREATE UNIQUE INDEX "RepairJobDispatch_one_current_per_tech_key" ON "RepairJobDispatch"("technicianUserId") WHERE "status"='ACTIVE' AND "position"='CURRENT';
CREATE UNIQUE INDEX "RepairJobDispatch_one_next_per_tech_key" ON "RepairJobDispatch"("technicianUserId") WHERE "status"='STAGED' AND "position"='NEXT';
CREATE UNIQUE INDEX "RepairJobLaborClock_job_tech_key" ON "RepairJobLaborClock"("repairJobId","technicianUserId");
CREATE UNIQUE INDEX "RepairJobLaborClock_one_running_per_tech_key" ON "RepairJobLaborClock"("technicianUserId") WHERE "state"='RUNNING';
CREATE INDEX "RepairJobLaborClock_state_idx" ON "RepairJobLaborClock"("organizationId","state","updatedAt");
CREATE INDEX "RepairJobLaborEvent_org_time_idx" ON "RepairJobLaborEvent"("organizationId","occurredAt");
CREATE INDEX "RepairJobLaborEvent_job_time_idx" ON "RepairJobLaborEvent"("repairJobId","occurredAt");
CREATE INDEX "RepairJobLaborEvent_tech_time_idx" ON "RepairJobLaborEvent"("technicianUserId","occurredAt");
CREATE INDEX "RepairJobLaborEvent_correlation_idx" ON "RepairJobLaborEvent"("correlationId");

ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_procedureVersionId_fkey" FOREIGN KEY("procedureVersionId") REFERENCES "WorkProcedureVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkProcedureVersion" ADD CONSTRAINT "WorkProcedureVersion_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkProcedureVersion" ADD CONSTRAINT "WorkProcedureVersion_createdByUserId_fkey" FOREIGN KEY("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkProcedureVersion" ADD CONSTRAINT "WorkProcedureVersion_supersedesId_fkey" FOREIGN KEY("supersedesId") REFERENCES "WorkProcedureVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianQualification" ADD CONSTRAINT "TechnicianQualification_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianQualification" ADD CONSTRAINT "TechnicianQualification_technicianUserId_fkey" FOREIGN KEY("technicianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TechnicianQualification" ADD CONSTRAINT "TechnicianQualification_verifiedByUserId_fkey" FOREIGN KEY("verifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobDispatch" ADD CONSTRAINT "RepairJobDispatch_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobDispatch" ADD CONSTRAINT "RepairJobDispatch_locationId_fkey" FOREIGN KEY("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobDispatch" ADD CONSTRAINT "RepairJobDispatch_repairJobId_fkey" FOREIGN KEY("repairJobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobDispatch" ADD CONSTRAINT "RepairJobDispatch_technicianUserId_fkey" FOREIGN KEY("technicianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobDispatch" ADD CONSTRAINT "RepairJobDispatch_bayResourceId_fkey" FOREIGN KEY("bayResourceId") REFERENCES "SchedulableResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobDispatch" ADD CONSTRAINT "RepairJobDispatch_assignedByUserId_fkey" FOREIGN KEY("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobDispatch" ADD CONSTRAINT "RepairJobDispatch_supersedesId_fkey" FOREIGN KEY("supersedesId") REFERENCES "RepairJobDispatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobLaborClock" ADD CONSTRAINT "RepairJobLaborClock_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobLaborClock" ADD CONSTRAINT "RepairJobLaborClock_repairJobId_fkey" FOREIGN KEY("repairJobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobLaborClock" ADD CONSTRAINT "RepairJobLaborClock_technicianUserId_fkey" FOREIGN KEY("technicianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobLaborEvent" ADD CONSTRAINT "RepairJobLaborEvent_organizationId_fkey" FOREIGN KEY("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobLaborEvent" ADD CONSTRAINT "RepairJobLaborEvent_repairJobId_fkey" FOREIGN KEY("repairJobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobLaborEvent" ADD CONSTRAINT "RepairJobLaborEvent_technicianUserId_fkey" FOREIGN KEY("technicianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairJobLaborEvent" ADD CONSTRAINT "RepairJobLaborEvent_actorUserId_fkey" FOREIGN KEY("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_shop_execution_evidence_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION '% is immutable',TG_TABLE_NAME; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "WorkProcedureVersion_prevent_mutation" BEFORE UPDATE OR DELETE ON "WorkProcedureVersion" FOR EACH ROW EXECUTE FUNCTION prevent_shop_execution_evidence_mutation();
CREATE TRIGGER "TechnicianQualification_prevent_mutation" BEFORE UPDATE OR DELETE ON "TechnicianQualification" FOR EACH ROW EXECUTE FUNCTION prevent_shop_execution_evidence_mutation();
CREATE TRIGGER "RepairJobLaborEvent_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairJobLaborEvent" FOR EACH ROW EXECUTE FUNCTION prevent_shop_execution_evidence_mutation();
