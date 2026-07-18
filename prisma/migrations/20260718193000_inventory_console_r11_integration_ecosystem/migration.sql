CREATE TYPE "EnterpriseIntegrationDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "EnterpriseIntegrationEnvironment" AS ENUM ('SANDBOX', 'PILOT', 'PRODUCTION');
CREATE TYPE "EnterpriseIntegrationExchangeState" AS ENUM ('RECEIVED', 'VALIDATED', 'REQUESTED', 'PENDING_ACKNOWLEDGEMENT', 'ACKNOWLEDGED', 'REJECTED', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'RECONCILIATION_REQUIRED', 'RECONCILED', 'CANCELLED');
CREATE TYPE "EnterpriseIntegrationConflictKind" AS ENUM ('MISSING', 'DUPLICATE', 'MISMATCHED', 'STALE', 'REJECTED', 'OUT_OF_BALANCE');
CREATE TYPE "EnterpriseIntegrationConflictStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'ACCEPTED_DIFFERENCE', 'CANCELLED');

CREATE TABLE "EnterpriseIntegrationExchange" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "systemCode" TEXT NOT NULL,
  "adapterVersion" TEXT NOT NULL,
  "mappingVersion" TEXT NOT NULL,
  "environment" "EnterpriseIntegrationEnvironment" NOT NULL DEFAULT 'SANDBOX',
  "direction" "EnterpriseIntegrationDirection" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "internalRecordId" TEXT,
  "externalReference" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "state" "EnterpriseIntegrationExchangeState" NOT NULL,
  "acknowledgementCode" TEXT,
  "acknowledgementSnapshot" JSONB NOT NULL,
  "lineageSnapshot" JSONB NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "nextAttemptAt" TIMESTAMP(3),
  "requestedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseIntegrationExchange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseIntegrationConflict" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "exchangeId" TEXT,
  "systemCode" TEXT NOT NULL,
  "kind" "EnterpriseIntegrationConflictKind" NOT NULL,
  "status" "EnterpriseIntegrationConflictStatus" NOT NULL DEFAULT 'OPEN',
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "externalReference" TEXT,
  "summary" TEXT NOT NULL,
  "internalSnapshot" JSONB NOT NULL,
  "externalSnapshot" JSONB NOT NULL,
  "ownerUserId" TEXT,
  "resolutionCode" TEXT,
  "resolutionNotes" TEXT,
  "verifiedByUserId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseIntegrationConflict_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseIntegrationExchange_org_system_direction_idem_key" ON "EnterpriseIntegrationExchange"("organizationId", "systemCode", "direction", "idempotencyKey");
CREATE INDEX "EnterpriseIntegrationExchange_org_system_state_updated_idx" ON "EnterpriseIntegrationExchange"("organizationId", "systemCode", "state", "updatedAt");
CREATE INDEX "EnterpriseIntegrationExchange_org_external_ref_idx" ON "EnterpriseIntegrationExchange"("organizationId", "externalReference");
CREATE INDEX "EnterpriseIntegrationExchange_correlation_idx" ON "EnterpriseIntegrationExchange"("correlationId");
CREATE INDEX "EnterpriseIntegrationConflict_org_status_detected_idx" ON "EnterpriseIntegrationConflict"("organizationId", "status", "detectedAt");
CREATE INDEX "EnterpriseIntegrationConflict_org_system_kind_idx" ON "EnterpriseIntegrationConflict"("organizationId", "systemCode", "kind");
CREATE INDEX "EnterpriseIntegrationConflict_entity_idx" ON "EnterpriseIntegrationConflict"("entityType", "entityId");
CREATE INDEX "EnterpriseIntegrationConflict_exchange_idx" ON "EnterpriseIntegrationConflict"("exchangeId");
ALTER TABLE "EnterpriseIntegrationExchange" ADD CONSTRAINT "EnterpriseIntegrationExchange_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseIntegrationConflict" ADD CONSTRAINT "EnterpriseIntegrationConflict_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseIntegrationConflict" ADD CONSTRAINT "EnterpriseIntegrationConflict_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "EnterpriseIntegrationExchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
