CREATE TABLE "InventoryGovernanceRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "recordType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "scopeSnapshot" JSONB NOT NULL,
    "resultSnapshot" JSONB NOT NULL,
    "contentHash" TEXT,
    "watermark" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryGovernanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryGovernanceRecordEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryGovernanceRecordEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryGovernanceRecord_organizationId_recordType_idempotencyKey_key" ON "InventoryGovernanceRecord"("organizationId", "recordType", "idempotencyKey");
CREATE INDEX "InventoryGovernanceRecord_organizationId_recordType_status_updatedAt_idx" ON "InventoryGovernanceRecord"("organizationId", "recordType", "status", "updatedAt");
CREATE INDEX "InventoryGovernanceRecord_organizationId_ownerUserId_status_idx" ON "InventoryGovernanceRecord"("organizationId", "ownerUserId", "status");
CREATE INDEX "InventoryGovernanceRecord_subjectType_subjectId_idx" ON "InventoryGovernanceRecord"("subjectType", "subjectId");
CREATE UNIQUE INDEX "InventoryGovernanceRecordEvent_recordId_version_key" ON "InventoryGovernanceRecordEvent"("recordId", "version");
CREATE INDEX "InventoryGovernanceRecordEvent_organizationId_occurredAt_idx" ON "InventoryGovernanceRecordEvent"("organizationId", "occurredAt");
CREATE INDEX "InventoryGovernanceRecordEvent_correlationId_idx" ON "InventoryGovernanceRecordEvent"("correlationId");
ALTER TABLE "InventoryGovernanceRecordEvent" ADD CONSTRAINT "InventoryGovernanceRecordEvent_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "InventoryGovernanceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
