ALTER TYPE "TaskSourceType" ADD VALUE IF NOT EXISTS 'REPAIR_ORDER';

CREATE TABLE "RepairOrderTaskLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "repairJobId" TEXT,
    "taskId" TEXT NOT NULL,
    "assignmentKey" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RepairOrderTaskLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepairOrderTaskLink_taskId_key" ON "RepairOrderTaskLink"("taskId");
CREATE UNIQUE INDEX "RepairOrderTaskLink_organizationId_repairOrderId_assignmentKey_key"
    ON "RepairOrderTaskLink"("organizationId", "repairOrderId", "assignmentKey");
CREATE INDEX "RepairOrderTaskLink_repairOrderId_assignmentKey_idx"
    ON "RepairOrderTaskLink"("repairOrderId", "assignmentKey");
CREATE INDEX "RepairOrderTaskLink_repairJobId_idx" ON "RepairOrderTaskLink"("repairJobId");

ALTER TABLE "RepairOrderTaskLink" ADD CONSTRAINT "RepairOrderTaskLink_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderTaskLink" ADD CONSTRAINT "RepairOrderTaskLink_repairOrderId_fkey"
    FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepairOrderTaskLink" ADD CONSTRAINT "RepairOrderTaskLink_repairJobId_fkey"
    FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepairOrderTaskLink" ADD CONSTRAINT "RepairOrderTaskLink_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepairOrderTaskLink" ADD CONSTRAINT "RepairOrderTaskLink_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
