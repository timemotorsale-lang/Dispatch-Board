CREATE TABLE "RepairPriority" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "planDate" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "nextAction" TEXT NOT NULL DEFAULT '',
    "blocker" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "durationMinutes" INTEGER,
    "ownerUserId" TEXT,
    "taskId" TEXT,
    "appointmentId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RepairPriority_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RepairPriority_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RepairPriority_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RepairPriority_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RepairPriority_locationId_checklistItemId_sourceKey_key"
ON "RepairPriority"("locationId", "checklistItemId", "sourceKey");

CREATE INDEX "RepairPriority_locationId_planDate_priority_idx"
ON "RepairPriority"("locationId", "planDate", "priority");
