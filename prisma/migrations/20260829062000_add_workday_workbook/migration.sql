-- CreateEnum
CREATE TYPE "WorkdayWorkbookScope" AS ENUM ('COO', 'STAFF');

-- CreateEnum
CREATE TYPE "WorkdayWorkbookStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkdayChecklistStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "WorkdayQuickUpdateCategory" AS ENUM ('CUSTOMER', 'VENDOR', 'FACILITY', 'STAFF', 'SALES_OPPORTUNITY', 'FINANCE', 'INVENTORY_PARTS', 'SAFETY', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkdayReportSeedSourceType" AS ENUM ('CHECKLIST_ITEM', 'QUICK_UPDATE', 'OPERATING_EXCEPTION');

-- CreateEnum
CREATE TYPE "WorkdayReportSeedTone" AS ENUM ('GREEN', 'YELLOW', 'RED', 'BLUE');

-- CreateEnum
CREATE TYPE "WorkdayReportSeedStatus" AS ENUM ('CANDIDATE', 'INCLUDED', 'EXCLUDED', 'CARRIED_OVER');

-- CreateTable
CREATE TABLE "WorkdayWorkbook" (
    "id" TEXT NOT NULL,
    "boardDayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "WorkdayWorkbookScope" NOT NULL DEFAULT 'COO',
    "status" "WorkdayWorkbookStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkdayWorkbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkdayChecklistItem" (
    "id" TEXT NOT NULL,
    "workbookId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "WorkdayChecklistStatus" NOT NULL DEFAULT 'GREEN',
    "update" TEXT NOT NULL DEFAULT '',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "carryoverReady" BOOLEAN NOT NULL DEFAULT false,
    "convertedTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkdayChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkdayQuickUpdate" (
    "id" TEXT NOT NULL,
    "workbookId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" "WorkdayQuickUpdateCategory" NOT NULL DEFAULT 'OTHER',
    "person" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "dueWindow" TEXT NOT NULL DEFAULT '',
    "carryoverReady" BOOLEAN NOT NULL DEFAULT false,
    "convertedTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkdayQuickUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkdayReportSeed" (
    "id" TEXT NOT NULL,
    "workbookId" TEXT NOT NULL,
    "sourceType" "WorkdayReportSeedSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "tone" "WorkdayReportSeedTone" NOT NULL,
    "status" "WorkdayReportSeedStatus" NOT NULL DEFAULT 'CANDIDATE',
    "sourceHref" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkdayReportSeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkdayWorkbook_boardDayId_userId_scope_key" ON "WorkdayWorkbook"("boardDayId", "userId", "scope");

-- CreateIndex
CREATE INDEX "WorkdayWorkbook_userId_scope_status_idx" ON "WorkdayWorkbook"("userId", "scope", "status");

-- CreateIndex
CREATE INDEX "WorkdayWorkbook_boardDayId_scope_idx" ON "WorkdayWorkbook"("boardDayId", "scope");

-- CreateIndex
CREATE INDEX "WorkdayChecklistItem_workbookId_status_done_idx" ON "WorkdayChecklistItem"("workbookId", "status", "done");

-- CreateIndex
CREATE INDEX "WorkdayChecklistItem_convertedTaskId_idx" ON "WorkdayChecklistItem"("convertedTaskId");

-- CreateIndex
CREATE INDEX "WorkdayQuickUpdate_workbookId_category_followUpNeeded_idx" ON "WorkdayQuickUpdate"("workbookId", "category", "followUpNeeded");

-- CreateIndex
CREATE INDEX "WorkdayQuickUpdate_convertedTaskId_idx" ON "WorkdayQuickUpdate"("convertedTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkdayReportSeed_workbookId_sourceType_sourceId_key" ON "WorkdayReportSeed"("workbookId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "WorkdayReportSeed_workbookId_status_tone_idx" ON "WorkdayReportSeed"("workbookId", "status", "tone");

-- AddForeignKey
ALTER TABLE "WorkdayWorkbook" ADD CONSTRAINT "WorkdayWorkbook_boardDayId_fkey" FOREIGN KEY ("boardDayId") REFERENCES "BoardDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayWorkbook" ADD CONSTRAINT "WorkdayWorkbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayChecklistItem" ADD CONSTRAINT "WorkdayChecklistItem_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayChecklistItem" ADD CONSTRAINT "WorkdayChecklistItem_convertedTaskId_fkey" FOREIGN KEY ("convertedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayQuickUpdate" ADD CONSTRAINT "WorkdayQuickUpdate_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayQuickUpdate" ADD CONSTRAINT "WorkdayQuickUpdate_convertedTaskId_fkey" FOREIGN KEY ("convertedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkdayReportSeed" ADD CONSTRAINT "WorkdayReportSeed_workbookId_fkey" FOREIGN KEY ("workbookId") REFERENCES "WorkdayWorkbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
