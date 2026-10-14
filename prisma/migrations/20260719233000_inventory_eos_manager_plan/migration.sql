CREATE TYPE "InventoryManagerDecision" AS ENUM ('APPROVE_COMPLETE', 'RETURN_FOR_REWORK', 'REQUIRE_DIAGNOSIS', 'HOLD', 'CANCEL');
CREATE TABLE "InventoryManagerPlan" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "workPacketId" TEXT NOT NULL,
  "decision" "InventoryManagerDecision" NOT NULL, "direction" TEXT NOT NULL, "internalNote" TEXT,
  "nextWorkSnapshot" JSONB, "publishedTaskId" TEXT, "publishedWorkPacketId" TEXT,
  "decidedByUserId" TEXT NOT NULL, "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryManagerPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryManagerPlan_workPacketId_fkey" FOREIGN KEY ("workPacketId") REFERENCES "InventoryWorkPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryManagerPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryManagerPlan_publishedTaskId_fkey" FOREIGN KEY ("publishedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryManagerPlan_publishedWorkPacketId_fkey" FOREIGN KEY ("publishedWorkPacketId") REFERENCES "InventoryWorkPacket"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryManagerPlan_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryManagerPlan_workPacketId_key" ON "InventoryManagerPlan"("workPacketId");
CREATE INDEX "InventoryManagerPlan_organizationId_decision_decidedAt_idx" ON "InventoryManagerPlan"("organizationId", "decision", "decidedAt");
CREATE INDEX "InventoryManagerPlan_decidedByUserId_decidedAt_idx" ON "InventoryManagerPlan"("decidedByUserId", "decidedAt");
CREATE INDEX "InventoryManagerPlan_publishedTaskId_idx" ON "InventoryManagerPlan"("publishedTaskId");
