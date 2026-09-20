ALTER TABLE "ConcernCase" ADD COLUMN "slaPolicyId" TEXT;
ALTER TABLE "ConcernCase" ADD COLUMN "slaStage" TEXT NOT NULL DEFAULT 'HEALTHY';
ALTER TABLE "ConcernCase" ADD COLUMN "slaEvaluatedAt" TIMESTAMP(3);

CREATE TABLE "CustomerSlaPolicy" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "code" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "timezone" TEXT NOT NULL, "businessWindows" JSONB NOT NULL,
  "severityTargets" JSONB NOT NULL, "pauseReasonCodes" JSONB NOT NULL, "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CustomerSlaPolicy_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CustomerSlaPause" (
  "id" TEXT NOT NULL, "concernCaseId" TEXT NOT NULL, "reasonCode" TEXT NOT NULL, "notes" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL, "nextReviewAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3),
  "startedByUserId" TEXT NOT NULL, "endedByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerSlaPause_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CustomerSlaAlert" (
  "id" TEXT NOT NULL, "concernCaseId" TEXT NOT NULL, "clockType" TEXT NOT NULL, "stage" TEXT NOT NULL,
  "taskId" TEXT, "firstDetectedAt" TIMESTAMP(3) NOT NULL, "lastDetectedAt" TIMESTAMP(3) NOT NULL,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1, "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerSlaAlert_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerSlaPolicy_organizationId_code_version_key" ON "CustomerSlaPolicy"("organizationId", "code", "version");
CREATE INDEX "CustomerSlaPolicy_organizationId_status_effectiveFrom_idx" ON "CustomerSlaPolicy"("organizationId", "status", "effectiveFrom");
CREATE INDEX "CustomerSlaPause_concernCaseId_startedAt_idx" ON "CustomerSlaPause"("concernCaseId", "startedAt");
CREATE INDEX "CustomerSlaPause_endedAt_nextReviewAt_idx" ON "CustomerSlaPause"("endedAt", "nextReviewAt");
CREATE UNIQUE INDEX "CustomerSlaAlert_concernCaseId_clockType_stage_key" ON "CustomerSlaAlert"("concernCaseId", "clockType", "stage");
CREATE INDEX "CustomerSlaAlert_stage_resolvedAt_lastDetectedAt_idx" ON "CustomerSlaAlert"("stage", "resolvedAt", "lastDetectedAt");
CREATE INDEX "ConcernCase_slaStage_status_resolutionDueAt_idx" ON "ConcernCase"("slaStage", "status", "resolutionDueAt");
ALTER TABLE "CustomerSlaPolicy" ADD CONSTRAINT "CustomerSlaPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConcernCase" ADD CONSTRAINT "ConcernCase_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "CustomerSlaPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerSlaPause" ADD CONSTRAINT "CustomerSlaPause_concernCaseId_fkey" FOREIGN KEY ("concernCaseId") REFERENCES "ConcernCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerSlaAlert" ADD CONSTRAINT "CustomerSlaAlert_concernCaseId_fkey" FOREIGN KEY ("concernCaseId") REFERENCES "ConcernCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CustomerSlaPolicy" ("id", "organizationId", "code", "version", "timezone", "businessWindows", "severityTargets", "pauseReasonCodes", "effectiveFrom", "updatedAt")
SELECT
  'sla-time-motor-sales-v1', 'org-time-motor-sales', 'CUSTOMER_CASE_DEFAULT', 1, 'America/Chicago',
  '[{"day":"MONDAY","openMinute":540,"closeMinute":1080},{"day":"TUESDAY","openMinute":540,"closeMinute":1080},{"day":"WEDNESDAY","openMinute":540,"closeMinute":1080},{"day":"THURSDAY","openMinute":540,"closeMinute":1080},{"day":"FRIDAY","openMinute":540,"closeMinute":1080}]'::jsonb,
  '{"P0":{"responseMinutes":15,"resolutionMinutes":480,"updateMinutes":120},"P1":{"responseMinutes":120,"resolutionMinutes":1440,"updateMinutes":480},"P2":{"responseMinutes":480,"resolutionMinutes":2400,"updateMinutes":960},"P3":{"responseMinutes":960,"resolutionMinutes":4800,"updateMinutes":1920}}'::jsonb,
  '["WAITING_CUSTOMER","WAITING_EXTERNAL"]'::jsonb, '2026-07-12T00:00:00.000Z', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'org-time-motor-sales');
