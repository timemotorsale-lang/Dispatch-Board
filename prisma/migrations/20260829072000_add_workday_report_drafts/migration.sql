-- Extend COO workbook report intelligence with reviewed seeds and saved daily drafts.
CREATE TYPE "WorkdayReportDraftStatus" AS ENUM ('DRAFT', 'SUBMITTED');

ALTER TABLE "WorkdayReportSeed" ADD COLUMN "reviewNote" TEXT NOT NULL DEFAULT '';

CREATE TABLE "WorkdayReportDraft" (
    "id" TEXT NOT NULL,
    "workbookId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "WorkdayReportDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "sourceSeedIds" JSONB NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkdayReportDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkdayReportDraft_workbookId_version_key" ON "WorkdayReportDraft"("workbookId", "version");
CREATE INDEX "WorkdayReportDraft_workbookId_status_generatedAt_idx" ON "WorkdayReportDraft"("workbookId", "status", "generatedAt");

ALTER TABLE "WorkdayReportDraft" ADD CONSTRAINT "WorkdayReportDraft_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
