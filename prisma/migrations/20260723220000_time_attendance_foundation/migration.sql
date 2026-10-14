CREATE TYPE "TimeAttendancePolicyProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE "TimeAttendanceSessionState" AS ENUM ('OPEN', 'ON_MEAL', 'CLOSED', 'EXCEPTION');
CREATE TYPE "TimeAttendanceEventType" AS ENUM ('CLOCK_IN', 'START_MEAL', 'END_MEAL', 'CLOCK_OUT', 'MANAGER_CORRECTION', 'SYSTEM_DERIVATION');
CREATE TYPE "TimeAttendanceEventSource" AS ENUM ('WEB', 'MANAGER', 'IMPORT', 'SYSTEM');
CREATE TYPE "TimeAttendanceBreakKind" AS ENUM ('PAID_REST', 'MEAL');
CREATE TYPE "TimeCardStatus" AS ENUM ('OPEN', 'EMPLOYEE_REVIEW', 'ATTESTED', 'MANAGER_REVIEW', 'APPROVED', 'LOCKED', 'EXPORTED', 'REOPENED', 'VOID');
CREATE TYPE "TimeCardExceptionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'WAIVED');
CREATE TYPE "TimeOffRequestType" AS ENUM ('PTO', 'ESST', 'UNPAID', 'HOLIDAY', 'PROTECTED_REFERRAL');
CREATE TYPE "TimeOffRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'LEAVE_ADMIN_REVIEW', 'APPROVED', 'DENIED', 'WITHDRAWN', 'CANCELLED');
CREATE TYPE "TimeAttendanceExportStatus" AS ENUM ('DRAFT', 'LOCKED', 'EXPORTED', 'ACKNOWLEDGED', 'REJECTED', 'RECONCILED', 'VOID');

CREATE TABLE "TimeAttendancePolicyProfile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "TimeAttendancePolicyProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "jurisdiction" TEXT NOT NULL DEFAULT 'MINNESOTA',
  "timezone" TEXT NOT NULL,
  "workweekStartDay" "BusinessDay" NOT NULL,
  "workweekStartMinute" INTEGER NOT NULL DEFAULT 0,
  "payBasis" TEXT NOT NULL,
  "overtimeCoverage" TEXT NOT NULL,
  "roundingPolicy" TEXT NOT NULL DEFAULT 'EXACT_TIME',
  "scheduledMealPolicy" JSONB NOT NULL,
  "breakPolicyVersionIds" JSONB NOT NULL,
  "esstPolicyVersionId" TEXT,
  "payrollMapping" JSONB NOT NULL,
  "sourceSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeAttendancePolicyProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeAttendancePolicyAssignment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "staffUserId" TEXT NOT NULL,
  "policyProfileId" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "approvedByUserId" TEXT NOT NULL,
  "approvalReason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeAttendancePolicyAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeAttendanceSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "workDate" DATE NOT NULL,
  "timezone" TEXT NOT NULL,
  "state" "TimeAttendanceSessionState" NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeAttendanceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeAttendanceEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "sessionId" TEXT,
  "commandId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "eventType" "TimeAttendanceEventType" NOT NULL,
  "source" "TimeAttendanceEventSource" NOT NULL DEFAULT 'WEB',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "evidence" JSONB NOT NULL,
  "correctionOfEventId" TEXT,
  "correctedByEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeAttendanceEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeAttendanceBreakInterval" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "kind" "TimeAttendanceBreakKind" NOT NULL,
  "startEventId" TEXT NOT NULL,
  "endEventId" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3),
  "paid" BOOLEAN NOT NULL,
  "completelyRelieved" BOOLEAN NOT NULL DEFAULT false,
  "evidence" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeAttendanceBreakInterval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeCard" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "policyProfileId" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "status" "TimeCardStatus" NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 0,
  "sourceEventChecksum" TEXT NOT NULL,
  "calculationSnapshot" JSONB NOT NULL,
  "exceptionSnapshot" JSONB NOT NULL,
  "payrollReady" BOOLEAN NOT NULL DEFAULT false,
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeCardException" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "timeCardId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" "TimeCardExceptionStatus" NOT NULL DEFAULT 'OPEN',
  "blocking" BOOLEAN NOT NULL DEFAULT true,
  "message" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolutionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeCardException_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeCardAttestation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "timeCardId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "timeCardVersion" INTEGER NOT NULL,
  "attestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statement" TEXT NOT NULL,
  "cardChecksum" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeCardAttestation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeCardApproval" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "timeCardId" TEXT NOT NULL,
  "managerUserId" TEXT NOT NULL,
  "timeCardVersion" INTEGER NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decision" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "cardChecksum" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeCardApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeOffRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "requestType" "TimeOffRequestType" NOT NULL,
  "status" "TimeOffRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "requestedMinutes" INTEGER NOT NULL,
  "protectedRouting" BOOLEAN NOT NULL DEFAULT false,
  "operationalNote" TEXT,
  "restrictedReasonHash" TEXT,
  "balanceSnapshot" JSONB NOT NULL,
  "decisionActorUserId" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeOffBalance" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balanceType" "TimeOffRequestType" NOT NULL,
  "policyProfileId" TEXT,
  "balanceYear" INTEGER NOT NULL,
  "accruedMinutes" INTEGER NOT NULL DEFAULT 0,
  "usedMinutes" INTEGER NOT NULL DEFAULT 0,
  "availableMinutes" INTEGER NOT NULL DEFAULT 0,
  "bankCapMinutes" INTEGER,
  "annualAccrualCapMinutes" INTEGER,
  "sourceSnapshot" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeOffBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeAttendanceExportBatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "batchNumber" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "status" "TimeAttendanceExportStatus" NOT NULL DEFAULT 'DRAFT',
  "fileChecksum" TEXT,
  "exportSnapshot" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "exportedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeAttendanceExportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeAttendanceExportLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "exportBatchId" TEXT NOT NULL,
  "timeCardId" TEXT NOT NULL,
  "timeCardVersion" INTEGER NOT NULL,
  "earningCode" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "amountCents" INTEGER,
  "lineSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeAttendanceExportLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimeAttendancePolicyProfile_organizationId_code_version_key" ON "TimeAttendancePolicyProfile"("organizationId", "code", "version");
CREATE INDEX "TimeAttendancePolicyProfile_organizationId_locationId_status_idx" ON "TimeAttendancePolicyProfile"("organizationId", "locationId", "status");
CREATE INDEX "TimeAttendancePolicyProfile_effectiveFrom_effectiveTo_idx" ON "TimeAttendancePolicyProfile"("effectiveFrom", "effectiveTo");
CREATE INDEX "TimeAttendancePolicyAssignment_organizationId_staffUserId_effectiveFrom_effectiveTo_idx" ON "TimeAttendancePolicyAssignment"("organizationId", "staffUserId", "effectiveFrom", "effectiveTo");
CREATE INDEX "TimeAttendancePolicyAssignment_policyProfileId_effectiveFrom_effectiveTo_idx" ON "TimeAttendancePolicyAssignment"("policyProfileId", "effectiveFrom", "effectiveTo");
CREATE UNIQUE INDEX "TimeAttendanceSession_id_organizationId_key" ON "TimeAttendanceSession"("id", "organizationId");
CREATE UNIQUE INDEX "TimeAttendanceSession_one_active_per_staff_key" ON "TimeAttendanceSession"("organizationId", "staffUserId") WHERE "state" IN ('OPEN', 'ON_MEAL');
CREATE INDEX "TimeAttendanceSession_organizationId_locationId_workDate_idx" ON "TimeAttendanceSession"("organizationId", "locationId", "workDate");
CREATE INDEX "TimeAttendanceSession_staffUserId_openedAt_idx" ON "TimeAttendanceSession"("staffUserId", "openedAt");
CREATE UNIQUE INDEX "TimeAttendanceEvent_organizationId_eventType_staffUserId_occurredAt_source_key" ON "TimeAttendanceEvent"("organizationId", "eventType", "staffUserId", "occurredAt", "source");
CREATE INDEX "TimeAttendanceEvent_organizationId_staffUserId_occurredAt_idx" ON "TimeAttendanceEvent"("organizationId", "staffUserId", "occurredAt");
CREATE INDEX "TimeAttendanceEvent_sessionId_occurredAt_idx" ON "TimeAttendanceEvent"("sessionId", "occurredAt");
CREATE INDEX "TimeAttendanceEvent_commandId_idx" ON "TimeAttendanceEvent"("commandId");
CREATE INDEX "TimeAttendanceEvent_correctionOfEventId_idx" ON "TimeAttendanceEvent"("correctionOfEventId");
CREATE INDEX "TimeAttendanceBreakInterval_organizationId_staffUserId_startAt_idx" ON "TimeAttendanceBreakInterval"("organizationId", "staffUserId", "startAt");
CREATE INDEX "TimeAttendanceBreakInterval_sessionId_startAt_idx" ON "TimeAttendanceBreakInterval"("sessionId", "startAt");
CREATE UNIQUE INDEX "TimeCard_organizationId_staffUserId_periodStart_periodEnd_version_key" ON "TimeCard"("organizationId", "staffUserId", "periodStart", "periodEnd", "version");
CREATE INDEX "TimeCard_organizationId_locationId_status_periodStart_idx" ON "TimeCard"("organizationId", "locationId", "status", "periodStart");
CREATE INDEX "TimeCard_staffUserId_periodStart_periodEnd_idx" ON "TimeCard"("staffUserId", "periodStart", "periodEnd");
CREATE INDEX "TimeCardException_timeCardId_status_idx" ON "TimeCardException"("timeCardId", "status");
CREATE INDEX "TimeCardException_organizationId_code_status_idx" ON "TimeCardException"("organizationId", "code", "status");
CREATE UNIQUE INDEX "TimeCardAttestation_timeCardId_timeCardVersion_staffUserId_key" ON "TimeCardAttestation"("timeCardId", "timeCardVersion", "staffUserId");
CREATE INDEX "TimeCardAttestation_organizationId_staffUserId_attestedAt_idx" ON "TimeCardAttestation"("organizationId", "staffUserId", "attestedAt");
CREATE UNIQUE INDEX "TimeCardApproval_timeCardId_timeCardVersion_managerUserId_key" ON "TimeCardApproval"("timeCardId", "timeCardVersion", "managerUserId");
CREATE INDEX "TimeCardApproval_organizationId_managerUserId_approvedAt_idx" ON "TimeCardApproval"("organizationId", "managerUserId", "approvedAt");
CREATE INDEX "TimeOffRequest_organizationId_locationId_status_startsAt_idx" ON "TimeOffRequest"("organizationId", "locationId", "status", "startsAt");
CREATE INDEX "TimeOffRequest_requesterUserId_startsAt_endsAt_idx" ON "TimeOffRequest"("requesterUserId", "startsAt", "endsAt");
CREATE UNIQUE INDEX "TimeOffBalance_organizationId_userId_balanceType_balanceYear_key" ON "TimeOffBalance"("organizationId", "userId", "balanceType", "balanceYear");
CREATE UNIQUE INDEX "TimeAttendanceExportBatch_organizationId_batchNumber_key" ON "TimeAttendanceExportBatch"("organizationId", "batchNumber");
CREATE INDEX "TimeAttendanceExportBatch_organizationId_locationId_status_periodStart_idx" ON "TimeAttendanceExportBatch"("organizationId", "locationId", "status", "periodStart");
CREATE UNIQUE INDEX "TimeAttendanceExportLine_exportBatchId_timeCardId_timeCardVersion_earningCode_key" ON "TimeAttendanceExportLine"("exportBatchId", "timeCardId", "timeCardVersion", "earningCode");
CREATE INDEX "TimeAttendanceExportLine_organizationId_timeCardId_idx" ON "TimeAttendanceExportLine"("organizationId", "timeCardId");

ALTER TABLE "TimeAttendancePolicyProfile" ADD CONSTRAINT "TimeAttendancePolicyProfile_required_text_check" CHECK (BTRIM("code") <> '' AND BTRIM("name") <> '' AND BTRIM("timezone") <> '' AND BTRIM("payBasis") <> '' AND BTRIM("overtimeCoverage") <> '' AND "roundingPolicy" = 'EXACT_TIME');
ALTER TABLE "TimeAttendancePolicyProfile" ADD CONSTRAINT "TimeAttendancePolicyProfile_effective_window_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");
ALTER TABLE "TimeAttendancePolicyProfile" ADD CONSTRAINT "TimeAttendancePolicyProfile_minutes_check" CHECK ("workweekStartMinute" >= 0 AND "workweekStartMinute" < 1440 AND "version" >= 1);
ALTER TABLE "TimeAttendancePolicyAssignment" ADD CONSTRAINT "TimeAttendancePolicyAssignment_effective_window_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");
ALTER TABLE "TimeAttendancePolicyAssignment" ADD CONSTRAINT "TimeAttendancePolicyAssignment_reason_check" CHECK (LENGTH(BTRIM("approvalReason")) >= 10);
ALTER TABLE "TimeAttendanceSession" ADD CONSTRAINT "TimeAttendanceSession_closed_after_open_check" CHECK ("closedAt" IS NULL OR "closedAt" > "openedAt");
ALTER TABLE "TimeAttendanceSession" ADD CONSTRAINT "TimeAttendanceSession_closed_state_check" CHECK (("state" IN ('CLOSED', 'EXCEPTION') AND "closedAt" IS NOT NULL) OR ("state" IN ('OPEN', 'ON_MEAL') AND "closedAt" IS NULL));
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_reason_check" CHECK ("reason" IS NULL OR LENGTH(BTRIM("reason")) >= 10);
ALTER TABLE "TimeAttendanceBreakInterval" ADD CONSTRAINT "TimeAttendanceBreakInterval_end_after_start_check" CHECK ("endAt" IS NULL OR "endAt" > "startAt");
ALTER TABLE "TimeAttendanceBreakInterval" ADD CONSTRAINT "TimeAttendanceBreakInterval_end_event_pair_check" CHECK (("endAt" IS NULL AND "endEventId" IS NULL) OR ("endAt" IS NOT NULL AND "endEventId" IS NOT NULL));
ALTER TABLE "TimeCard" ADD CONSTRAINT "TimeCard_period_check" CHECK ("periodEnd" >= "periodStart" AND "version" >= 0 AND BTRIM("sourceEventChecksum") <> '');
ALTER TABLE "TimeCardException" ADD CONSTRAINT "TimeCardException_required_text_check" CHECK (BTRIM("code") <> '' AND BTRIM("message") <> '');
ALTER TABLE "TimeCardException" ADD CONSTRAINT "TimeCardException_resolution_check" CHECK (("status" IN ('RESOLVED', 'WAIVED') AND "resolvedAt" IS NOT NULL AND "resolvedByUserId" IS NOT NULL) OR ("status" IN ('OPEN', 'ACKNOWLEDGED')));
ALTER TABLE "TimeCardAttestation" ADD CONSTRAINT "TimeCardAttestation_required_text_check" CHECK (BTRIM("statement") <> '' AND BTRIM("cardChecksum") <> '' AND "timeCardVersion" >= 0);
ALTER TABLE "TimeCardApproval" ADD CONSTRAINT "TimeCardApproval_required_text_check" CHECK (BTRIM("decision") <> '' AND LENGTH(BTRIM("reason")) >= 10 AND BTRIM("cardChecksum") <> '' AND "timeCardVersion" >= 0);
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_interval_check" CHECK ("endsAt" > "startsAt" AND "requestedMinutes" > 0);
ALTER TABLE "TimeOffBalance" ADD CONSTRAINT "TimeOffBalance_minutes_check" CHECK ("balanceYear" >= 2000 AND "accruedMinutes" >= 0 AND "usedMinutes" >= 0 AND "availableMinutes" >= 0 AND ("bankCapMinutes" IS NULL OR "bankCapMinutes" >= 0) AND ("annualAccrualCapMinutes" IS NULL OR "annualAccrualCapMinutes" >= 0));
ALTER TABLE "TimeAttendanceExportBatch" ADD CONSTRAINT "TimeAttendanceExportBatch_period_check" CHECK ("periodEnd" >= "periodStart" AND BTRIM("batchNumber") <> '');
ALTER TABLE "TimeAttendanceExportLine" ADD CONSTRAINT "TimeAttendanceExportLine_minutes_check" CHECK ("timeCardVersion" >= 0 AND "minutes" >= 0 AND BTRIM("earningCode") <> '');

ALTER TABLE "TimeAttendancePolicyProfile" ADD CONSTRAINT "TimeAttendancePolicyProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendancePolicyProfile" ADD CONSTRAINT "TimeAttendancePolicyProfile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendancePolicyAssignment" ADD CONSTRAINT "TimeAttendancePolicyAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendancePolicyAssignment" ADD CONSTRAINT "TimeAttendancePolicyAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendancePolicyAssignment" ADD CONSTRAINT "TimeAttendancePolicyAssignment_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendancePolicyAssignment" ADD CONSTRAINT "TimeAttendancePolicyAssignment_policyProfileId_fkey" FOREIGN KEY ("policyProfileId") REFERENCES "TimeAttendancePolicyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendancePolicyAssignment" ADD CONSTRAINT "TimeAttendancePolicyAssignment_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceSession" ADD CONSTRAINT "TimeAttendanceSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceSession" ADD CONSTRAINT "TimeAttendanceSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceSession" ADD CONSTRAINT "TimeAttendanceSession_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TimeAttendanceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "EnterpriseCommandLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_correctionOfEventId_fkey" FOREIGN KEY ("correctionOfEventId") REFERENCES "TimeAttendanceEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceEvent" ADD CONSTRAINT "TimeAttendanceEvent_correctedByEventId_fkey" FOREIGN KEY ("correctedByEventId") REFERENCES "TimeAttendanceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceBreakInterval" ADD CONSTRAINT "TimeAttendanceBreakInterval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceBreakInterval" ADD CONSTRAINT "TimeAttendanceBreakInterval_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceBreakInterval" ADD CONSTRAINT "TimeAttendanceBreakInterval_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TimeAttendanceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceBreakInterval" ADD CONSTRAINT "TimeAttendanceBreakInterval_startEventId_fkey" FOREIGN KEY ("startEventId") REFERENCES "TimeAttendanceEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceBreakInterval" ADD CONSTRAINT "TimeAttendanceBreakInterval_endEventId_fkey" FOREIGN KEY ("endEventId") REFERENCES "TimeAttendanceEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCard" ADD CONSTRAINT "TimeCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCard" ADD CONSTRAINT "TimeCard_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCard" ADD CONSTRAINT "TimeCard_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCard" ADD CONSTRAINT "TimeCard_policyProfileId_fkey" FOREIGN KEY ("policyProfileId") REFERENCES "TimeAttendancePolicyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCardException" ADD CONSTRAINT "TimeCardException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCardException" ADD CONSTRAINT "TimeCardException_timeCardId_fkey" FOREIGN KEY ("timeCardId") REFERENCES "TimeCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCardException" ADD CONSTRAINT "TimeCardException_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeCardAttestation" ADD CONSTRAINT "TimeCardAttestation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCardAttestation" ADD CONSTRAINT "TimeCardAttestation_timeCardId_fkey" FOREIGN KEY ("timeCardId") REFERENCES "TimeCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCardAttestation" ADD CONSTRAINT "TimeCardAttestation_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCardApproval" ADD CONSTRAINT "TimeCardApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCardApproval" ADD CONSTRAINT "TimeCardApproval_timeCardId_fkey" FOREIGN KEY ("timeCardId") REFERENCES "TimeCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeCardApproval" ADD CONSTRAINT "TimeCardApproval_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_decisionActorUserId_fkey" FOREIGN KEY ("decisionActorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeOffBalance" ADD CONSTRAINT "TimeOffBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeOffBalance" ADD CONSTRAINT "TimeOffBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceExportBatch" ADD CONSTRAINT "TimeAttendanceExportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceExportBatch" ADD CONSTRAINT "TimeAttendanceExportBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceExportBatch" ADD CONSTRAINT "TimeAttendanceExportBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceExportLine" ADD CONSTRAINT "TimeAttendanceExportLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceExportLine" ADD CONSTRAINT "TimeAttendanceExportLine_exportBatchId_fkey" FOREIGN KEY ("exportBatchId") REFERENCES "TimeAttendanceExportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceExportLine" ADD CONSTRAINT "TimeAttendanceExportLine_timeCardId_fkey" FOREIGN KEY ("timeCardId") REFERENCES "TimeCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
