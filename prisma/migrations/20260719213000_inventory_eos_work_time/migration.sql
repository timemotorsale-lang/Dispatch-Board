CREATE TYPE "InventoryWorkSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

CREATE TABLE "InventoryWorkSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workPacketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "InventoryWorkSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "activeSince" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
  "estimateAtStartMinutes" INTEGER,
  "lastCheckpointAt" TIMESTAMP(3),
  "checkpointCode" TEXT,
  "checkpointNote" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryWorkSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryWorkSession_seconds_check" CHECK ("accumulatedSeconds" >= 0),
  CONSTRAINT "InventoryWorkSession_estimate_check" CHECK ("estimateAtStartMinutes" IS NULL OR ("estimateAtStartMinutes" > 0 AND "estimateAtStartMinutes" <= 1440)),
  CONSTRAINT "InventoryWorkSession_version_check" CHECK ("version" > 0),
  CONSTRAINT "InventoryWorkSession_workPacketId_fkey" FOREIGN KEY ("workPacketId") REFERENCES "InventoryWorkPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "InventoryWorkSession_organizationId_workPacketId_status_idx" ON "InventoryWorkSession"("organizationId", "workPacketId", "status");
CREATE INDEX "InventoryWorkSession_organizationId_userId_status_idx" ON "InventoryWorkSession"("organizationId", "userId", "status");
CREATE INDEX "InventoryWorkSession_workPacketId_startedAt_idx" ON "InventoryWorkSession"("workPacketId", "startedAt");

-- One open session per packet and per staff member prevents double-counted touch time.
CREATE UNIQUE INDEX "InventoryWorkSession_one_open_per_packet"
  ON "InventoryWorkSession"("organizationId", "workPacketId")
  WHERE "status" IN ('ACTIVE', 'PAUSED');
CREATE UNIQUE INDEX "InventoryWorkSession_one_open_per_user"
  ON "InventoryWorkSession"("organizationId", "userId")
  WHERE "status" IN ('ACTIVE', 'PAUSED');
