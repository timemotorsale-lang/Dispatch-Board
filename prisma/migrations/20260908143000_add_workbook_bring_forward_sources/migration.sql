-- Add source lineage for prior-day work that staff brings back into today's workbook.
ALTER TABLE "WorkdayChecklistItem"
  ADD COLUMN "sourceType" TEXT,
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "sourceBoardDate" TIMESTAMP(3),
  ADD COLUMN "sourceHref" TEXT,
  ADD COLUMN "broughtForwardAt" TIMESTAMP(3),
  ADD COLUMN "broughtForwardByUserId" TEXT;

ALTER TABLE "WorkdayDailyFocusItem"
  ADD COLUMN "sourceType" TEXT,
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "sourceBoardDate" TIMESTAMP(3),
  ADD COLUMN "sourceHref" TEXT,
  ADD COLUMN "broughtForwardAt" TIMESTAMP(3),
  ADD COLUMN "broughtForwardByUserId" TEXT;

CREATE INDEX "WorkdayChecklistItem_workbookId_sourceType_sourceId_idx"
  ON "WorkdayChecklistItem"("workbookId", "sourceType", "sourceId");

CREATE INDEX "WorkdayDailyFocusItem_workbookId_sourceType_sourceId_idx"
  ON "WorkdayDailyFocusItem"("workbookId", "sourceType", "sourceId");
