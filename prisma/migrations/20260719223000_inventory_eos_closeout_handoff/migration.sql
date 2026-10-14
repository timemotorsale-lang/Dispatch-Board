CREATE TYPE "InventoryCloseoutOutcome" AS ENUM ('COMPLETED', 'PARTIAL', 'CANNOT_COMPLETE', 'FURTHER_DIAGNOSIS');
CREATE TYPE "InventoryWorkHandoffStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED');

CREATE TABLE "InventoryTechnicianCloseout" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "workPacketId" TEXT NOT NULL, "workSessionId" TEXT,
  "outcome" "InventoryCloseoutOutcome" NOT NULL, "workPerformed" JSONB NOT NULL, "partsDisposition" JSONB NOT NULL,
  "findings" JSONB NOT NULL, "verification" JSONB NOT NULL, "qcState" TEXT NOT NULL, "explanation" TEXT,
  "observation" TEXT, "testsPerformed" TEXT, "recommendedNextStep" TEXT, "diagnosticMinutes" INTEGER,
  "operability" TEXT, "dependencySnapshot" JSONB, "optionalNotes" TEXT, "evidenceSnapshot" JSONB NOT NULL,
  "submittedByUserId" TEXT NOT NULL, "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryTechnicianCloseout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryTechnicianCloseout_diagnosticMinutes_check" CHECK ("diagnosticMinutes" IS NULL OR ("diagnosticMinutes" >= 0 AND "diagnosticMinutes" <= 1440)),
  CONSTRAINT "InventoryTechnicianCloseout_workPacketId_fkey" FOREIGN KEY ("workPacketId") REFERENCES "InventoryWorkPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryTechnicianCloseout_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "InventoryWorkSession"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryTechnicianCloseout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryTechnicianCloseout_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryTechnicianCloseout_workPacketId_key" ON "InventoryTechnicianCloseout"("workPacketId");
CREATE INDEX "InventoryTechnicianCloseout_organizationId_outcome_submittedAt_idx" ON "InventoryTechnicianCloseout"("organizationId", "outcome", "submittedAt");
CREATE INDEX "InventoryTechnicianCloseout_submittedByUserId_submittedAt_idx" ON "InventoryTechnicianCloseout"("submittedByUserId", "submittedAt");

CREATE TABLE "InventoryWorkHandoff" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "workPacketId" TEXT NOT NULL, "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL, "nextAction" TEXT NOT NULL, "targetAt" TIMESTAMP(3) NOT NULL,
  "status" "InventoryWorkHandoffStatus" NOT NULL DEFAULT 'OFFERED', "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3), "rejectedAt" TIMESTAMP(3), "responseReasonCode" TEXT, "responseNote" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryWorkHandoff_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryWorkHandoff_workPacketId_fkey" FOREIGN KEY ("workPacketId") REFERENCES "InventoryWorkPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkHandoff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkHandoff_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryWorkHandoff_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InventoryWorkHandoff_organizationId_toUserId_status_targetAt_idx" ON "InventoryWorkHandoff"("organizationId", "toUserId", "status", "targetAt");
CREATE INDEX "InventoryWorkHandoff_workPacketId_status_idx" ON "InventoryWorkHandoff"("workPacketId", "status");
CREATE UNIQUE INDEX "InventoryWorkHandoff_one_open_per_packet" ON "InventoryWorkHandoff"("organizationId", "workPacketId") WHERE "status" = 'OFFERED';
