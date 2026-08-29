-- CreateEnum
CREATE TYPE "WorkdayReportCadence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "WorkdayCarryoverStatus" AS ENUM ('OPEN', 'CONFIRMED', 'DISMISSED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "WorkdaySupportActionStatus" AS ENUM ('OPEN', 'UPDATE_REQUESTED', 'RESOLVED');

-- AlterTable
ALTER TABLE "WorkdayWorkbook" ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "closedByUserId" TEXT,
ADD COLUMN "closeSnapshot" JSONB;

-- AlterTable
ALTER TABLE "WorkdayReportDraft" ADD COLUMN "cadence" "WorkdayReportCadence" NOT NULL DEFAULT 'DAILY',
ADD COLUMN "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "periodEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "WorkdayCarryover" (
    "id" TEXT NOT NULL,
    "workbookId" TEXT NOT NULL,
    "sourceType" "WorkdayReportSeedSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceHref" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" "WorkdayCarryoverStatus" NOT NULL DEFAULT 'OPEN',
    "targetBoardDate" TIMESTAMP(3) NOT NULL,
    "convertedTaskId" TEXT,
    "dismissedReason" TEXT NOT NULL DEFAULT '',
    "confirmedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkdayCarryover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkdaySupportAction" (
    "id" TEXT NOT NULL,
    "workbookId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "status" "WorkdaySupportActionStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT NOT NULL,
    "requestedUpdate" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkdaySupportAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkdayCarryover_workbookId_sourceType_sourceId_targetBoardDate_key" ON "WorkdayCarryover"("workbookId", "sourceType", "sourceId", "targetBoardDate");

-- CreateIndex
CREATE INDEX "WorkdayCarryover_workbookId_status_targetBoardDate_idx" ON "WorkdayCarryover"("workbookId", "status", "targetBoardDate");

-- CreateIndex
CREATE INDEX "WorkdayCarryover_convertedTaskId_idx" ON "WorkdayCarryover"("convertedTaskId");

-- CreateIndex
CREATE INDEX "WorkdaySupportAction_workbookId_status_createdAt_idx" ON "WorkdaySupportAction"("workbookId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkdaySupportAction_targetUserId_status_idx" ON "WorkdaySupportAction"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "WorkdayReportDraft_workbookId_cadence_status_generatedAt_idx" ON "WorkdayReportDraft"("workbookId", "cadence", "status", "generatedAt");

-- AddForeignKey
ALTER TABLE "WorkdayCarryover" ADD CONSTRAINT "WorkdayCarryover_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayCarryover" ADD CONSTRAINT "WorkdayCarryover_convertedTaskId_fkey" FOREIGN KEY ("convertedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdaySupportAction" ADD CONSTRAINT "WorkdaySupportAction_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
