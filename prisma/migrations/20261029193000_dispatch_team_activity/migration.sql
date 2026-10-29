BEGIN;
ALTER TABLE "ReportingRevision" ADD COLUMN "correctionReason" TEXT;
CREATE TABLE "DispatchPresence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessDate" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "primaryTaskId" TEXT,
  "primaryFocusId" TEXT,
  "nextAction" TEXT NOT NULL DEFAULT '',
  "startedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DispatchPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DispatchPresence_primaryTaskId_fkey" FOREIGN KEY ("primaryTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DispatchPresence_primaryFocusId_fkey" FOREIGN KEY ("primaryFocusId") REFERENCES "WorkdayDailyFocusItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DispatchPresence_userId_key" ON "DispatchPresence"("userId");
CREATE INDEX "DispatchPresence_organizationId_businessDate_idx" ON "DispatchPresence"("organizationId","businessDate");
CREATE TABLE "DispatchHandoff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "receiverUserId" TEXT NOT NULL,
  "previousAssignedUserId" TEXT NOT NULL,
  "nextAction" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DispatchHandoff_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DispatchHandoff_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DispatchHandoff_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DispatchHandoff_organizationId_status_createdAt_idx" ON "DispatchHandoff"("organizationId","status","createdAt");
CREATE INDEX "DispatchHandoff_receiverUserId_status_idx" ON "DispatchHandoff"("receiverUserId","status");
CREATE INDEX "DispatchHandoff_taskId_status_idx" ON "DispatchHandoff"("taskId","status");
CREATE UNIQUE INDEX "DispatchHandoff_one_pending_per_task" ON "DispatchHandoff"("taskId") WHERE "status" = 'PENDING';
CREATE INDEX "WorkdayReportDraft_period_lookup_idx" ON "WorkdayReportDraft"("periodStart","cadence","workbookId","version" DESC);
COMMIT;
