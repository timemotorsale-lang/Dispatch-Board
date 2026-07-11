ALTER TYPE "TaskSourceType" ADD VALUE IF NOT EXISTS 'CONCERN';

CREATE TYPE "ConcernStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'READY_FOR_CLOSURE', 'CLOSED');
CREATE TYPE "ConcernSource" AS ENUM ('MANAGER', 'QUICK_LOG');
CREATE TYPE "ConcernClosureOutcome" AS ENUM ('TITLE_RECEIVED', 'TITLE_MAILED', 'PAPERWORK_RESUBMITTED');

ALTER TABLE "Task" ADD COLUMN "priority" "TaskTemplatePriority" NOT NULL DEFAULT 'MEDIUM';

ALTER TABLE "TaskChecklistItem"
  ADD COLUMN "key" TEXT,
  ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "completedByUserId" TEXT;

ALTER TABLE "ActivityEvent" ADD COLUMN "concernCaseId" TEXT;

CREATE TABLE "ConcernCase" (
  "id" TEXT NOT NULL,
  "concernNumber" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "boardDayId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "secondaryCategory" TEXT,
  "workflowArea" "WorkflowArea" NOT NULL,
  "riskType" TEXT NOT NULL,
  "priority" "TaskTemplatePriority" NOT NULL,
  "status" "ConcernStatus" NOT NULL DEFAULT 'OPEN',
  "source" "ConcernSource" NOT NULL,
  "customerReference" TEXT,
  "vehicleReference" TEXT,
  "reportedByUserId" TEXT NOT NULL,
  "assignedOwnerId" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "managerVisible" BOOLEAN NOT NULL DEFAULT true,
  "escalationRequired" BOOLEAN NOT NULL DEFAULT false,
  "escalateAt" TIMESTAMP(3),
  "classificationSnapshot" JSONB NOT NULL,
  "severitySnapshot" JSONB NOT NULL,
  "templateCode" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "closureOutcome" "ConcernClosureOutcome",
  "closureReason" TEXT,
  "resolutionProof" TEXT,
  "closedAt" TIMESTAMP(3),
  "closedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConcernCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConcernTaskLink" (
  "id" TEXT NOT NULL,
  "concernCaseId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "stepCode" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "dependsOnStepCodes" JSONB NOT NULL,
  "completionCriteria" TEXT NOT NULL,
  "escalationRuleCode" TEXT,
  "blueprintSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConcernTaskLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConcernCase_concernNumber_key" ON "ConcernCase"("concernNumber");
CREATE UNIQUE INDEX "ConcernCase_reportedByUserId_idempotencyKey_key" ON "ConcernCase"("reportedByUserId", "idempotencyKey");
CREATE INDEX "ConcernCase_status_priority_dueAt_idx" ON "ConcernCase"("status", "priority", "dueAt");
CREATE INDEX "ConcernCase_assignedOwnerId_status_idx" ON "ConcernCase"("assignedOwnerId", "status");
CREATE INDEX "ConcernCase_escalationRequired_escalateAt_idx" ON "ConcernCase"("escalationRequired", "escalateAt");
CREATE INDEX "ConcernCase_boardDayId_createdAt_idx" ON "ConcernCase"("boardDayId", "createdAt");
CREATE UNIQUE INDEX "ConcernTaskLink_taskId_key" ON "ConcernTaskLink"("taskId");
CREATE UNIQUE INDEX "ConcernTaskLink_concernCaseId_stepCode_key" ON "ConcernTaskLink"("concernCaseId", "stepCode");
CREATE INDEX "ConcernTaskLink_concernCaseId_sortOrder_idx" ON "ConcernTaskLink"("concernCaseId", "sortOrder");
CREATE UNIQUE INDEX "TaskChecklistItem_taskId_key_key" ON "TaskChecklistItem"("taskId", "key");
CREATE INDEX "ActivityEvent_concernCaseId_createdAt_idx" ON "ActivityEvent"("concernCaseId", "createdAt");

ALTER TABLE "ConcernCase" ADD CONSTRAINT "ConcernCase_boardDayId_fkey" FOREIGN KEY ("boardDayId") REFERENCES "BoardDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConcernCase" ADD CONSTRAINT "ConcernCase_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConcernCase" ADD CONSTRAINT "ConcernCase_assignedOwnerId_fkey" FOREIGN KEY ("assignedOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConcernCase" ADD CONSTRAINT "ConcernCase_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConcernTaskLink" ADD CONSTRAINT "ConcernTaskLink_concernCaseId_fkey" FOREIGN KEY ("concernCaseId") REFERENCES "ConcernCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConcernTaskLink" ADD CONSTRAINT "ConcernTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_concernCaseId_fkey" FOREIGN KEY ("concernCaseId") REFERENCES "ConcernCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
