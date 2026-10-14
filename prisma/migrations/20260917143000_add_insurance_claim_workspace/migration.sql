-- Insurance claim workspace durable records.
CREATE TABLE "InsuranceClaim" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT,
  "vehicleId" TEXT,
  "linkedRepairOrderId" TEXT,
  "claimNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "stage" TEXT NOT NULL DEFAULT 'INTAKE',
  "lossDate" TEXT,
  "lossLocation" TEXT,
  "description" TEXT,
  "deductible" TEXT,
  "carrierName" TEXT,
  "policyNumber" TEXT,
  "adjusterName" TEXT,
  "adjusterPhone" TEXT,
  "adjusterEmail" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "vehicleYear" TEXT,
  "vehicleMake" TEXT,
  "vehicleModel" TEXT,
  "vehicleVin" TEXT,
  "vehiclePlate" TEXT,
  "vehicleStockNumber" TEXT,
  "ownerUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "duplicateExceptionReason" TEXT,
  "blockerReason" TEXT,
  "nextAction" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceClaimEvidence" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "documentLibraryId" TEXT,
  "fileName" TEXT,
  "notes" TEXT,
  "relationshipTargets" JSONB NOT NULL DEFAULT '[]',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsuranceClaimEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceClaimActivity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "at" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsuranceClaimActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InsuranceClaim_organizationId_claimNumber_key" ON "InsuranceClaim"("organizationId", "claimNumber");
CREATE UNIQUE INDEX "InsuranceClaim_id_organizationId_key" ON "InsuranceClaim"("id", "organizationId");
CREATE INDEX "InsuranceClaim_organizationId_status_stage_lastActivityAt_idx" ON "InsuranceClaim"("organizationId", "status", "stage", "lastActivityAt");
CREATE INDEX "InsuranceClaim_organizationId_ownerUserId_lastActivityAt_idx" ON "InsuranceClaim"("organizationId", "ownerUserId", "lastActivityAt");
CREATE INDEX "InsuranceClaim_organizationId_customerId_idx" ON "InsuranceClaim"("organizationId", "customerId");
CREATE INDEX "InsuranceClaim_organizationId_vehicleId_idx" ON "InsuranceClaim"("organizationId", "vehicleId");
CREATE INDEX "InsuranceClaim_organizationId_linkedRepairOrderId_idx" ON "InsuranceClaim"("organizationId", "linkedRepairOrderId");
CREATE INDEX "InsuranceClaim_organizationId_carrierName_idx" ON "InsuranceClaim"("organizationId", "carrierName");

CREATE INDEX "InsuranceClaimEvidence_organizationId_claimId_category_idx" ON "InsuranceClaimEvidence"("organizationId", "claimId", "category");
CREATE INDEX "InsuranceClaimEvidence_organizationId_documentLibraryId_idx" ON "InsuranceClaimEvidence"("organizationId", "documentLibraryId");
CREATE INDEX "InsuranceClaimEvidence_organizationId_status_idx" ON "InsuranceClaimEvidence"("organizationId", "status");

CREATE INDEX "InsuranceClaimActivity_organizationId_claimId_at_idx" ON "InsuranceClaimActivity"("organizationId", "claimId", "at");
CREATE INDEX "InsuranceClaimActivity_organizationId_actorUserId_at_idx" ON "InsuranceClaimActivity"("organizationId", "actorUserId", "at");
CREATE INDEX "InsuranceClaimActivity_organizationId_action_at_idx" ON "InsuranceClaimActivity"("organizationId", "action", "at");

ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_linkedRepairOrderId_fkey" FOREIGN KEY ("linkedRepairOrderId") REFERENCES "RepairOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InsuranceClaimEvidence" ADD CONSTRAINT "InsuranceClaimEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaimEvidence" ADD CONSTRAINT "InsuranceClaimEvidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InsuranceClaimActivity" ADD CONSTRAINT "InsuranceClaimActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaimActivity" ADD CONSTRAINT "InsuranceClaimActivity_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
