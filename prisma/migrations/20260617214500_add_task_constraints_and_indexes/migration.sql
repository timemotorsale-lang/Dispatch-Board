CREATE UNIQUE INDEX "BoardDay_date_key" ON "BoardDay"("date");

CREATE UNIQUE INDEX "Task_boardDayId_sourceTemplateId_assignedUserId_key"
ON "Task"("boardDayId", "sourceTemplateId", "assignedUserId");

CREATE INDEX "Task_boardDayId_status_idx" ON "Task"("boardDayId", "status");

CREATE INDEX "Task_boardDayId_assignedUserId_idx" ON "Task"("boardDayId", "assignedUserId");

CREATE INDEX "Task_boardDayId_workflowArea_idx" ON "Task"("boardDayId", "workflowArea");

CREATE INDEX "GenerationRun_boardDate_startedAt_idx" ON "GenerationRun"("boardDate", "startedAt");

ALTER TABLE "Task"
ADD CONSTRAINT "Task_blocked_requires_blocker_reason_check"
CHECK (
  "status" <> 'BLOCKED'
  OR NULLIF(BTRIM("blockerReason"), '') IS NOT NULL
);
