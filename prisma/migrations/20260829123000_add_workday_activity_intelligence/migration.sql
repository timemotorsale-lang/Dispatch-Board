-- CreateEnum
CREATE TYPE "WorkdayActivityPurpose" AS ENUM (
  'PLANNED_WORK',
  'COMPLETED_WORK',
  'CUSTOMER_COMMUNICATION',
  'INTERNAL_COMMUNICATION',
  'BLOCKER_RISK',
  'FOLLOW_UP',
  'PROMISE_COMMITMENT',
  'SUPPORT_REQUEST',
  'CARRYOVER',
  'TASK_CONVERSION',
  'LEARNING_COACHING_SIGNAL',
  'REPORT_WORTHY_EVENT',
  'TIME_ATTENTION'
);

-- CreateTable
CREATE TABLE "WorkdayActivitySignal" (
  "id" TEXT NOT NULL,
  "workbookId" TEXT NOT NULL,
  "boardDayId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "purpose" "WorkdayActivityPurpose" NOT NULL,
  "businessImpact" TEXT NOT NULL DEFAULT '',
  "reportRelevant" BOOLEAN NOT NULL DEFAULT false,
  "coachingRelevant" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkdayActivitySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkdayAttentionSession" (
  "id" TEXT NOT NULL,
  "workbookId" TEXT NOT NULL,
  "boardDayId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceArea" TEXT NOT NULL,
  "sourcePath" TEXT NOT NULL DEFAULT '',
  "sessionKey" TEXT NOT NULL,
  "activeSeconds" INTEGER NOT NULL DEFAULT 0,
  "idleSeconds" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkdayAttentionSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkdayActivitySignal_workbookId_sourceType_sourceId_actionTyp_key" ON "WorkdayActivitySignal"("workbookId", "sourceType", "sourceId", "actionType");

-- CreateIndex
CREATE INDEX "WorkdayActivitySignal_boardDayId_actorUserId_occurredAt_idx" ON "WorkdayActivitySignal"("boardDayId", "actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkdayActivitySignal_workbookId_purpose_occurredAt_idx" ON "WorkdayActivitySignal"("workbookId", "purpose", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkdayActivitySignal_reportRelevant_occurredAt_idx" ON "WorkdayActivitySignal"("reportRelevant", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkdayAttentionSession_workbookId_userId_sourceArea_session_key" ON "WorkdayAttentionSession"("workbookId", "userId", "sourceArea", "sessionKey");

-- CreateIndex
CREATE INDEX "WorkdayAttentionSession_boardDayId_userId_sourceArea_idx" ON "WorkdayAttentionSession"("boardDayId", "userId", "sourceArea");

-- CreateIndex
CREATE INDEX "WorkdayAttentionSession_workbookId_lastHeartbeatAt_idx" ON "WorkdayAttentionSession"("workbookId", "lastHeartbeatAt");

-- AddForeignKey
ALTER TABLE "WorkdayActivitySignal" ADD CONSTRAINT "WorkdayActivitySignal_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayActivitySignal" ADD CONSTRAINT "WorkdayActivitySignal_boardDayId_fkey" FOREIGN KEY ("boardDayId") REFERENCES "BoardDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayActivitySignal" ADD CONSTRAINT "WorkdayActivitySignal_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayAttentionSession" ADD CONSTRAINT "WorkdayAttentionSession_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayAttentionSession" ADD CONSTRAINT "WorkdayAttentionSession_boardDayId_fkey" FOREIGN KEY ("boardDayId") REFERENCES "BoardDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayAttentionSession" ADD CONSTRAINT "WorkdayAttentionSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
