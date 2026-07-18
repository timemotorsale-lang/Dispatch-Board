CREATE TYPE "InventoryConsolePilotStatus" AS ENUM ('DRAFT', 'EVIDENCE_IN_PROGRESS', 'READY_FOR_AUTHORIZATION', 'AUTHORIZED', 'ACTIVE', 'PAUSED', 'ROLLED_BACK', 'COMPLETED', 'REJECTED');
CREATE TYPE "InventoryConsoleEvidenceStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'PASSED', 'FAILED', 'WAIVED');
CREATE TYPE "InventoryConsoleSignoffDecision" AS ENUM ('PENDING', 'APPROVE', 'REJECT');

CREATE TABLE "InventoryConsolePilot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "InventoryConsolePilotStatus" NOT NULL DEFAULT 'DRAFT',
  "scopeSnapshot" JSONB NOT NULL,
  "thresholdSnapshot" JSONB NOT NULL,
  "pauseCriteriaSnapshot" JSONB NOT NULL,
  "rollbackPlanSnapshot" JSONB NOT NULL,
  "baselineSnapshot" JSONB NOT NULL,
  "outcomeSnapshot" JSONB NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "supportOwnerUserId" TEXT,
  "authorizationNote" TEXT,
  "authorizedByUserId" TEXT,
  "authorizedAt" TIMESTAMP(3),
  "activatedByUserId" TEXT,
  "activatedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryConsolePilot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryConsoleReadinessEvidence" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "pilotId" TEXT NOT NULL,
  "gateCode" TEXT NOT NULL,
  "status" "InventoryConsoleEvidenceStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "summary" TEXT NOT NULL,
  "evidenceReferences" JSONB NOT NULL,
  "measurementSnapshot" JSONB NOT NULL,
  "submittedByUserId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "waiverAuthority" TEXT,
  "waiverReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryConsoleReadinessEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryConsoleSignoff" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "pilotId" TEXT NOT NULL,
  "dimension" TEXT NOT NULL,
  "decision" "InventoryConsoleSignoffDecision" NOT NULL DEFAULT 'PENDING',
  "signerUserId" TEXT,
  "reason" TEXT,
  "evidenceRefs" JSONB NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryConsoleSignoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryConsolePilot_organizationId_code_key" ON "InventoryConsolePilot"("organizationId", "code");
CREATE INDEX "InventoryConsolePilot_organizationId_status_updatedAt_idx" ON "InventoryConsolePilot"("organizationId", "status", "updatedAt");
CREATE UNIQUE INDEX "InventoryConsoleReadinessEvidence_pilotId_gateCode_key" ON "InventoryConsoleReadinessEvidence"("pilotId", "gateCode");
CREATE INDEX "InventoryConsoleReadinessEvidence_organizationId_gateCode_status_idx" ON "InventoryConsoleReadinessEvidence"("organizationId", "gateCode", "status");
CREATE UNIQUE INDEX "InventoryConsoleSignoff_pilotId_dimension_key" ON "InventoryConsoleSignoff"("pilotId", "dimension");
CREATE INDEX "InventoryConsoleSignoff_organizationId_decision_updatedAt_idx" ON "InventoryConsoleSignoff"("organizationId", "decision", "updatedAt");
ALTER TABLE "InventoryConsolePilot" ADD CONSTRAINT "InventoryConsolePilot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryConsoleReadinessEvidence" ADD CONSTRAINT "InventoryConsoleReadinessEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryConsoleReadinessEvidence" ADD CONSTRAINT "InventoryConsoleReadinessEvidence_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "InventoryConsolePilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryConsoleSignoff" ADD CONSTRAINT "InventoryConsoleSignoff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryConsoleSignoff" ADD CONSTRAINT "InventoryConsoleSignoff_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "InventoryConsolePilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
