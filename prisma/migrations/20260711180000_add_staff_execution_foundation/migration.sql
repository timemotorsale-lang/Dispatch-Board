CREATE TYPE "StaffDayStatus" AS ENUM ('PLANNED', 'READY', 'ACTIVE', 'AVAILABLE', 'HANDOFF_PENDING', 'CLOSED');

CREATE TABLE "StaffDay" (
    "id" TEXT NOT NULL,
    "boardDayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "StaffDayStatus" NOT NULL DEFAULT 'PLANNED',
    "startAcknowledgedAt" TIMESTAMP(3),
    "startingBlockerCode" TEXT,
    "startingBlockerNote" TEXT,
    "availabilityDeclaredAt" TIMESTAMP(3),
    "availabilityReasonCode" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffDayDutyItem" (
    "id" TEXT NOT NULL,
    "staffDayId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceDutyId" TEXT,
    "sourceRoleId" TEXT,
    "sourceType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "workflowArea" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffDayDutyItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffDay_boardDayId_userId_key" ON "StaffDay"("boardDayId", "userId");
CREATE INDEX "StaffDay_userId_status_idx" ON "StaffDay"("userId", "status");
CREATE INDEX "StaffDay_boardDayId_status_idx" ON "StaffDay"("boardDayId", "status");
CREATE UNIQUE INDEX "StaffDayDutyItem_staffDayId_sourceKey_key" ON "StaffDayDutyItem"("staffDayId", "sourceKey");
CREATE INDEX "StaffDayDutyItem_staffDayId_sortOrder_idx" ON "StaffDayDutyItem"("staffDayId", "sortOrder");
CREATE INDEX "StaffDayDutyItem_sourceDutyId_idx" ON "StaffDayDutyItem"("sourceDutyId");
CREATE INDEX "StaffDayDutyItem_sourceRoleId_idx" ON "StaffDayDutyItem"("sourceRoleId");

ALTER TABLE "StaffDay" ADD CONSTRAINT "StaffDay_boardDayId_fkey" FOREIGN KEY ("boardDayId") REFERENCES "BoardDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffDay" ADD CONSTRAINT "StaffDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffDayDutyItem" ADD CONSTRAINT "StaffDayDutyItem_staffDayId_fkey" FOREIGN KEY ("staffDayId") REFERENCES "StaffDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffDayDutyItem" ADD CONSTRAINT "StaffDayDutyItem_sourceDutyId_fkey" FOREIGN KEY ("sourceDutyId") REFERENCES "Duty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffDayDutyItem" ADD CONSTRAINT "StaffDayDutyItem_sourceRoleId_fkey" FOREIGN KEY ("sourceRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffDayDutyItem" ADD CONSTRAINT "StaffDayDutyItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
