ALTER TABLE "Task"
ADD COLUMN "carryoverSourceTaskId" TEXT,
ADD COLUMN "carryoverReportId" TEXT;

CREATE UNIQUE INDEX "Task_boardDayId_carryoverSourceTaskId_key" ON "Task"("boardDayId", "carryoverSourceTaskId");
CREATE INDEX "Task_carryoverReportId_idx" ON "Task"("carryoverReportId");
