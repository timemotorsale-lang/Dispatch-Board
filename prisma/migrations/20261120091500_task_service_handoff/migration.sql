CREATE TABLE "TaskRepairHandoff" (
    "taskId" TEXT NOT NULL,
    "requestToken" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "receiverUserId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "concern" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "repairOrderId" TEXT,
    CONSTRAINT "TaskRepairHandoff_pkey" PRIMARY KEY ("taskId"),
    CONSTRAINT "TaskRepairHandoff_acceptance_check" CHECK (
        ("repairOrderId" IS NULL AND "acceptedAt" IS NULL AND "acceptedByUserId" IS NULL)
        OR ("repairOrderId" IS NOT NULL AND "acceptedAt" IS NOT NULL AND "acceptedByUserId" IS NOT NULL)
    ),
    CONSTRAINT "TaskRepairHandoff_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskRepairHandoff_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TaskRepairHandoff_organizationId_receiverUserId_repairOrderId_idx" ON "TaskRepairHandoff"("organizationId", "receiverUserId", "repairOrderId");
CREATE INDEX "TaskRepairHandoff_repairOrderId_idx" ON "TaskRepairHandoff"("repairOrderId");
