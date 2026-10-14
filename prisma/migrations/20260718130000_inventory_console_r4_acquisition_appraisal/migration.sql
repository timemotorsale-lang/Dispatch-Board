CREATE TYPE "InventoryAcquisitionCaseStatus" AS ENUM ('EVIDENCE_REQUIRED','READY_FOR_APPRAISAL','APPRAISAL_REVIEW','PROPOSAL_READY','AUTHORIZATION_PENDING','AUTHORIZED','OFFER_PENDING','COMMITMENT_ACCEPTED','INVENTORY_UNIT_CREATED','HANDOFF_READY','WATCH','DECLINED','INSUFFICIENT','REJECTED','EXPIRED','CANCELLED','REVERSAL_REVIEW','EXCEPTION');
CREATE TYPE "InventoryAcquisitionType" AS ENUM ('PURCHASE','TRADE','CONSIGNMENT','TRANSFER');

CREATE TABLE "InventoryAcquisitionCase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "acquisitionType" "InventoryAcquisitionType" NOT NULL,
  "intendedUse" TEXT NOT NULL,
  "status" "InventoryAcquisitionCaseStatus" NOT NULL DEFAULT 'EVIDENCE_REQUIRED',
  "identitySnapshot" JSONB NOT NULL,
  "evidenceSnapshot" JSONB NOT NULL,
  "appraisalSnapshot" JSONB NOT NULL,
  "recommendationSnapshot" JSONB NOT NULL,
  "authorizationSnapshot" JSONB NOT NULL,
  "offerSnapshot" JSONB NOT NULL,
  "commitmentSnapshot" JSONB NOT NULL,
  "resolutionSnapshot" JSONB NOT NULL,
  "inventoryUnitId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryAcquisitionCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryAcquisitionCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryAcquisitionCase_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryAcquisitionCase_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryAcquisitionCase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryAcquisitionCase_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryAcquisitionCase_inventoryUnitId_key" ON "InventoryAcquisitionCase"("inventoryUnitId");
CREATE UNIQUE INDEX "InventoryAcquisitionCase_organizationId_source_sourceReference_key" ON "InventoryAcquisitionCase"("organizationId","source","sourceReference");
CREATE INDEX "InventoryAcquisitionCase_organizationId_status_expiresAt_idx" ON "InventoryAcquisitionCase"("organizationId","status","expiresAt");
CREATE INDEX "InventoryAcquisitionCase_organizationId_locationId_status_idx" ON "InventoryAcquisitionCase"("organizationId","locationId","status");
CREATE INDEX "InventoryAcquisitionCase_vehicleId_status_idx" ON "InventoryAcquisitionCase"("vehicleId","status");
CREATE INDEX "InventoryAcquisitionCase_ownerUserId_status_expiresAt_idx" ON "InventoryAcquisitionCase"("ownerUserId","status","expiresAt");

CREATE TABLE "InventoryAcquisitionCaseEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "acquisitionCaseId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "fromStatus" "InventoryAcquisitionCaseStatus",
  "toStatus" "InventoryAcquisitionCaseStatus" NOT NULL,
  "commandType" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryAcquisitionCaseEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryAcquisitionCaseEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryAcquisitionCaseEvent_acquisitionCaseId_fkey" FOREIGN KEY ("acquisitionCaseId") REFERENCES "InventoryAcquisitionCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryAcquisitionCaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryAcquisitionCaseEvent_acquisitionCaseId_version_key" ON "InventoryAcquisitionCaseEvent"("acquisitionCaseId","version");
CREATE INDEX "InventoryAcquisitionCaseEvent_organizationId_occurredAt_idx" ON "InventoryAcquisitionCaseEvent"("organizationId","occurredAt");
CREATE INDEX "InventoryAcquisitionCaseEvent_correlationId_idx" ON "InventoryAcquisitionCaseEvent"("correlationId");
