CREATE TYPE "InventoryWorkPacketState" AS ENUM ('PLANNED', 'CURRENT', 'STAGED', 'WAITING', 'BLOCKED', 'READY_FOR_REVIEW', 'COMPLETED', 'CANCELLED');

CREATE TYPE "InventoryWorkUrgency" AS ENUM ('P0', 'P1', 'P2', 'P3', 'P4');

CREATE TYPE "InventoryWorkReadiness" AS ENUM ('READY', 'CONDITIONAL', 'NOT_READY', 'UNKNOWN');

CREATE TABLE "InventoryWorkPacket" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "inventoryUnitId" TEXT,
  "repairOrderId" TEXT,
  "repairJobId" TEXT,
  "locationId" TEXT,
  "stageCode" TEXT NOT NULL,
  "state" "InventoryWorkPacketState" NOT NULL DEFAULT 'PLANNED',
  "purpose" TEXT NOT NULL,
  "nextAction" TEXT NOT NULL,
  "definitionOfDone" TEXT NOT NULL,
  "urgency" "InventoryWorkUrgency" NOT NULL DEFAULT 'P3',
  "urgencyReason" TEXT NOT NULL,
  "readiness" "InventoryWorkReadiness" NOT NULL DEFAULT 'UNKNOWN',
  "readinessSnapshot" JSONB NOT NULL,
  "dependencySnapshot" JSONB NOT NULL,
  "evidenceRequirements" JSONB NOT NULL,
  "blockerRecovery" JSONB,
  "handoff" JSONB,
  "targetAt" TIMESTAMP(3) NOT NULL,
  "nextCheckAt" TIMESTAMP(3),
  "escalationAt" TIMESTAMP(3),
  "estimatedMinutes" INTEGER,
  "policyVersion" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryWorkPacket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryWorkPacket_estimatedMinutes_check" CHECK ("estimatedMinutes" IS NULL OR ("estimatedMinutes" > 0 AND "estimatedMinutes" <= 1440)),
  CONSTRAINT "InventoryWorkPacket_version_check" CHECK ("version" > 0),
  CONSTRAINT "InventoryWorkPacket_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkPacket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkPacket_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkPacket_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkPacket_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkPacket_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkPacket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InventoryWorkPacket_taskId_key" ON "InventoryWorkPacket"("taskId");
CREATE INDEX "InventoryWorkPacket_organizationId_vehicleId_state_idx" ON "InventoryWorkPacket"("organizationId", "vehicleId", "state");
CREATE INDEX "InventoryWorkPacket_organizationId_state_targetAt_idx" ON "InventoryWorkPacket"("organizationId", "state", "targetAt");
CREATE INDEX "InventoryWorkPacket_taskId_version_idx" ON "InventoryWorkPacket"("taskId", "version");
CREATE INDEX "InventoryWorkPacket_inventoryUnitId_idx" ON "InventoryWorkPacket"("inventoryUnitId");
CREATE INDEX "InventoryWorkPacket_repairOrderId_idx" ON "InventoryWorkPacket"("repairOrderId");

-- These partial unique indexes are the database-level protection for the official
-- one-current/one-staged invariant. Repository checks provide clearer errors; the
-- indexes are the final race-condition guard.
CREATE UNIQUE INDEX "InventoryWorkPacket_one_current_per_vehicle"
  ON "InventoryWorkPacket"("organizationId", "vehicleId")
  WHERE "state" = 'CURRENT';
CREATE UNIQUE INDEX "InventoryWorkPacket_one_staged_per_vehicle"
  ON "InventoryWorkPacket"("organizationId", "vehicleId")
  WHERE "state" = 'STAGED';
