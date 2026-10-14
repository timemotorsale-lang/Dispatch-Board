-- AlterTable
ALTER TABLE "StaffDailyReport" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "requestHash" TEXT;

-- CreateTable
CREATE TABLE "ReportingSeries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "calendarVersion" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "draft" JSONB,
    "acceptedRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportingSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingRevision" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "content" JSONB,
    "legacyDailyId" TEXT,

    CONSTRAINT "ReportingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingReview" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingCalendarPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportingCalendarPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "validFrom" TEXT NOT NULL,
    "validTo" TEXT,
    "dailyDueMinute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingExpectation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "reviewBy" TIMESTAMP(3) NOT NULL,
    "calendarVersion" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "disposition" TEXT NOT NULL DEFAULT 'REQUIRED',
    "reason" TEXT,

    CONSTRAINT "ReportingExpectation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingSavedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportingSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingJob" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "result" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportingSeries_organizationId_subjectUserId_periodStart_idx" ON "ReportingSeries"("organizationId", "subjectUserId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingSeries_organizationId_subjectUserId_cadence_period_key" ON "ReportingSeries"("organizationId", "subjectUserId", "cadence", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingRevision_legacyDailyId_key" ON "ReportingRevision"("legacyDailyId");

-- CreateIndex
CREATE INDEX "ReportingRevision_submittedAt_idx" ON "ReportingRevision"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingRevision_seriesId_version_key" ON "ReportingRevision"("seriesId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingRevision_seriesId_idempotencyKey_key" ON "ReportingRevision"("seriesId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ReportingReview_revisionId_createdAt_idx" ON "ReportingReview"("revisionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingCalendarPolicy_organizationId_version_key" ON "ReportingCalendarPolicy"("organizationId", "version");

-- CreateIndex
CREATE INDEX "ReportingAssignment_organizationId_subjectUserId_cadence_va_idx" ON "ReportingAssignment"("organizationId", "subjectUserId", "cadence", "validFrom");

-- CreateIndex
CREATE INDEX "ReportingExpectation_organizationId_dueAt_disposition_idx" ON "ReportingExpectation"("organizationId", "dueAt", "disposition");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingExpectation_organizationId_subjectUserId_cadence_p_key" ON "ReportingExpectation"("organizationId", "subjectUserId", "cadence", "periodStart");

-- CreateIndex
CREATE INDEX "ReportingSavedView_userId_createdAt_idx" ON "ReportingSavedView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportingSchedule_enabled_nextRunAt_idx" ON "ReportingSchedule"("enabled", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingJob_runKey_key" ON "ReportingJob"("runKey");

-- CreateIndex
CREATE INDEX "ReportingJob_status_lockedUntil_idx" ON "ReportingJob"("status", "lockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "StaffDailyReport_staffDayId_idempotencyKey_key" ON "StaffDailyReport"("staffDayId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "ReportingSeries" ADD CONSTRAINT "ReportingSeries_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingRevision" ADD CONSTRAINT "ReportingRevision_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ReportingSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingRevision" ADD CONSTRAINT "ReportingRevision_legacyDailyId_fkey" FOREIGN KEY ("legacyDailyId") REFERENCES "StaffDailyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingReview" ADD CONSTRAINT "ReportingReview_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ReportingRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingSavedView" ADD CONSTRAINT "ReportingSavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingSchedule" ADD CONSTRAINT "ReportingSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingJob" ADD CONSTRAINT "ReportingJob_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportingSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
