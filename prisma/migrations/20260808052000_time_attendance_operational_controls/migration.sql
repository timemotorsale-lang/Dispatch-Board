CREATE TABLE "TimeAttendancePayPeriodDefinition" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "TimeAttendancePolicyProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
  "periodLengthDays" INTEGER NOT NULL DEFAULT 7,
  "anchorDate" DATE NOT NULL,
  "timezone" TEXT NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "payrollMappingVersion" TEXT NOT NULL,
  "sourceSnapshot" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeAttendancePayPeriodDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeAttendanceNotification" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "recipientUserId" TEXT NOT NULL,
  "notificationType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "status" TEXT NOT NULL DEFAULT 'UNREAD',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "deliveryChannel" TEXT NOT NULL DEFAULT 'INTERNAL_ONLY',
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "TimeAttendanceNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimeAttendancePayPeriodDefinition_organizationId_locationId_code_version_key"
  ON "TimeAttendancePayPeriodDefinition"("organizationId", "locationId", "code", "version");
CREATE INDEX "TimeAttendancePayPeriodDefinition_organizationId_locationId_status_effectiveFrom_effectiveTo_idx"
  ON "TimeAttendancePayPeriodDefinition"("organizationId", "locationId", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "TimeAttendanceNotification_organizationId_recipientUserId_status_createdAt_idx"
  ON "TimeAttendanceNotification"("organizationId", "recipientUserId", "status", "createdAt");
CREATE INDEX "TimeAttendanceNotification_organizationId_notificationType_createdAt_idx"
  ON "TimeAttendanceNotification"("organizationId", "notificationType", "createdAt");
CREATE INDEX "TimeAttendanceNotification_sourceType_sourceId_idx"
  ON "TimeAttendanceNotification"("sourceType", "sourceId");

ALTER TABLE "TimeAttendancePayPeriodDefinition" ADD CONSTRAINT "TimeAttendancePayPeriodDefinition_required_text_check"
  CHECK (BTRIM("code") <> '' AND BTRIM("name") <> '' AND BTRIM("timezone") <> '' AND BTRIM("payrollMappingVersion") <> '');
ALTER TABLE "TimeAttendancePayPeriodDefinition" ADD CONSTRAINT "TimeAttendancePayPeriodDefinition_period_check"
  CHECK ("version" >= 1 AND "periodLengthDays" BETWEEN 1 AND 31 AND ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"));
ALTER TABLE "TimeAttendanceNotification" ADD CONSTRAINT "TimeAttendanceNotification_required_text_check"
  CHECK (BTRIM("notificationType") <> '' AND BTRIM("title") <> '' AND BTRIM("body") <> '' AND BTRIM("sourceType") <> '' AND "deliveryChannel" = 'INTERNAL_ONLY');
ALTER TABLE "TimeAttendanceNotification" ADD CONSTRAINT "TimeAttendanceNotification_status_check"
  CHECK ("status" IN ('UNREAD', 'READ', 'ARCHIVED') AND "severity" IN ('INFO', 'WARNING', 'CRITICAL'));

ALTER TABLE "TimeAttendancePayPeriodDefinition" ADD CONSTRAINT "TimeAttendancePayPeriodDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendancePayPeriodDefinition" ADD CONSTRAINT "TimeAttendancePayPeriodDefinition_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendancePayPeriodDefinition" ADD CONSTRAINT "TimeAttendancePayPeriodDefinition_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceNotification" ADD CONSTRAINT "TimeAttendanceNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceNotification" ADD CONSTRAINT "TimeAttendanceNotification_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeAttendanceNotification" ADD CONSTRAINT "TimeAttendanceNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
