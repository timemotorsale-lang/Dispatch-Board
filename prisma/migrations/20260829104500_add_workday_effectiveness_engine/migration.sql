-- CreateEnum
CREATE TYPE "WorkdayPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WorkdayRiskLevel" AS ENUM ('NONE', 'WATCH', 'BLOCKED');

-- CreateEnum
CREATE TYPE "WorkdayDailyFocusStatus" AS ENUM ('PLANNED', 'DONE', 'CARRY_OVER');

-- AlterTable
ALTER TABLE "WorkdayChecklistItem"
  ADD COLUMN "priority" "WorkdayPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "riskLevel" "WorkdayRiskLevel" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "riskNote" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "WorkdayDailyFocusItem" (
  "id" TEXT NOT NULL,
  "workbookId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "mustCloseToday" BOOLEAN NOT NULL DEFAULT false,
  "priority" "WorkdayPriority" NOT NULL DEFAULT 'HIGH',
  "riskLevel" "WorkdayRiskLevel" NOT NULL DEFAULT 'NONE',
  "riskNote" TEXT NOT NULL DEFAULT '',
  "supportNeeded" TEXT NOT NULL DEFAULT '',
  "status" "WorkdayDailyFocusStatus" NOT NULL DEFAULT 'PLANNED',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "convertedTaskId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkdayDailyFocusItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkdayChecklistItem_workbookId_priority_riskLevel_idx" ON "WorkdayChecklistItem"("workbookId", "priority", "riskLevel");

-- CreateIndex
CREATE INDEX "WorkdayDailyFocusItem_workbookId_status_priority_idx" ON "WorkdayDailyFocusItem"("workbookId", "status", "priority");

-- CreateIndex
CREATE INDEX "WorkdayDailyFocusItem_workbookId_riskLevel_idx" ON "WorkdayDailyFocusItem"("workbookId", "riskLevel");

-- CreateIndex
CREATE INDEX "WorkdayDailyFocusItem_convertedTaskId_idx" ON "WorkdayDailyFocusItem"("convertedTaskId");

-- AddForeignKey
ALTER TABLE "WorkdayDailyFocusItem" ADD CONSTRAINT "WorkdayDailyFocusItem_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayDailyFocusItem" ADD CONSTRAINT "WorkdayDailyFocusItem_convertedTaskId_fkey" FOREIGN KEY ("convertedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
