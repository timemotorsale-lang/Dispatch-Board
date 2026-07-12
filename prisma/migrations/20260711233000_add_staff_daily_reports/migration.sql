CREATE TYPE "StaffDailyReportStatus" AS ENUM ('SUBMITTED');

CREATE TABLE "StaffDailyReport" (
  "id" TEXT NOT NULL,
  "staffDayId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "StaffDailyReportStatus" NOT NULL DEFAULT 'SUBMITTED',
  "sourceSnapshot" JSONB NOT NULL,
  "accuracyConfirmed" BOOLEAN NOT NULL,
  "additionalContext" TEXT,
  "tomorrowFollowUp" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "submittedOnBehalfReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffDailyReport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StaffDailyReport" ADD CONSTRAINT "StaffDailyReport_staffDayId_fkey" FOREIGN KEY ("staffDayId") REFERENCES "StaffDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffDailyReport" ADD CONSTRAINT "StaffDailyReport_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "StaffDailyReport_staffDayId_version_key" ON "StaffDailyReport"("staffDayId", "version");
CREATE INDEX "StaffDailyReport_staffDayId_status_submittedAt_idx" ON "StaffDailyReport"("staffDayId", "status", "submittedAt");
CREATE INDEX "StaffDailyReport_submittedByUserId_submittedAt_idx" ON "StaffDailyReport"("submittedByUserId", "submittedAt");
