CREATE TYPE "ActivityEventType" AS ENUM (
  'DAILY_BOARD_GENERATED',
  'TASK_CREATED',
  'TASK_ASSIGNED',
  'ASSIGNMENT_RECOMMENDATION_MADE',
  'ASSIGNMENT_CHANGED',
  'DUE_TIME_CHANGED',
  'STATUS_CHANGED',
  'TASK_BLOCKED',
  'BLOCKER_REASON_ADDED',
  'TASK_WAITING_ON_PARTS',
  'TASK_WAITING_ON_APPROVAL',
  'TASK_READY_FOR_REVIEW',
  'MANAGER_APPROVED_COMPLETION',
  'TASK_COMPLETED',
  'COMMENT_ADDED'
);

CREATE TABLE "ActivityEvent" (
  "id" TEXT NOT NULL,
  "boardDayId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "taskId" TEXT,
  "eventType" "ActivityEventType" NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityEvent_boardDayId_createdAt_idx" ON "ActivityEvent"("boardDayId", "createdAt");

CREATE INDEX "ActivityEvent_taskId_idx" ON "ActivityEvent"("taskId");

CREATE INDEX "ActivityEvent_actorUserId_idx" ON "ActivityEvent"("actorUserId");

ALTER TABLE "ActivityEvent"
ADD CONSTRAINT "ActivityEvent_boardDayId_fkey"
FOREIGN KEY ("boardDayId") REFERENCES "BoardDay"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent"
ADD CONSTRAINT "ActivityEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent"
ADD CONSTRAINT "ActivityEvent_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
