CREATE TYPE "InventoryDispositionStage" AS ENUM ('CANDIDATE_REVIEW','APPRAISAL','CHANNEL_PRICING','APPROVAL','ACTIVATION','OFFERS_BIDS','SALE_TRANSFER','SETTLEMENT','CLOSED');
CREATE TYPE "InventoryDispositionOperatingState" AS ENUM ('ACTIVE','WAITING','BLOCKED','DEFERRED','DISMISSED','CANCELLED','CLOSED');

CREATE TABLE "InventoryDispositionCase" (
  "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"inventoryUnitId" TEXT NOT NULL,"locationId" TEXT NOT NULL,"ownerUserId" TEXT NOT NULL,
  "stage" "InventoryDispositionStage" NOT NULL DEFAULT 'CANDIDATE_REVIEW',"operatingState" "InventoryDispositionOperatingState" NOT NULL DEFAULT 'ACTIVE',
  "reasonCodes" JSONB NOT NULL,"candidateSnapshot" JSONB NOT NULL,"appraisalVersions" JSONB NOT NULL,"proposalVersions" JSONB NOT NULL,"approvalSnapshot" JSONB NOT NULL,"activationSnapshot" JSONB NOT NULL,"offerVersions" JSONB NOT NULL,"completionSnapshot" JSONB NOT NULL,"settlementSnapshot" JSONB NOT NULL,"recommendationSnapshot" JSONB NOT NULL,"exceptionSnapshot" JSONB NOT NULL,
  "targetAt" TIMESTAMP(3) NOT NULL,"nextAction" TEXT NOT NULL,"stateReason" TEXT,"deferredUntil" TIMESTAMP(3),"expiresAt" TIMESTAMP(3),"version" INTEGER NOT NULL DEFAULT 1,"closedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryDispositionCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryDispositionCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryDispositionCase_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryDispositionCase_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryDispositionCase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryDispositionCase_inventoryUnitId_key" ON "InventoryDispositionCase"("inventoryUnitId");
CREATE UNIQUE INDEX "InventoryDispositionCase_id_organizationId_key" ON "InventoryDispositionCase"("id","organizationId");
CREATE INDEX "InventoryDispositionCase_organizationId_stage_operatingState_targetAt_idx" ON "InventoryDispositionCase"("organizationId","stage","operatingState","targetAt");
CREATE INDEX "InventoryDispositionCase_organizationId_locationId_stage_idx" ON "InventoryDispositionCase"("organizationId","locationId","stage");
CREATE INDEX "InventoryDispositionCase_organizationId_ownerUserId_targetAt_idx" ON "InventoryDispositionCase"("organizationId","ownerUserId","targetAt");

CREATE TABLE "InventoryDispositionCaseEvent" (
  "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"dispositionCaseId" TEXT NOT NULL,"version" INTEGER NOT NULL,
  "fromStage" "InventoryDispositionStage","toStage" "InventoryDispositionStage" NOT NULL,"fromOperatingState" "InventoryDispositionOperatingState","toOperatingState" "InventoryDispositionOperatingState" NOT NULL,
  "commandType" TEXT NOT NULL,"snapshot" JSONB NOT NULL,"actorUserId" TEXT NOT NULL,"reason" TEXT NOT NULL,"correlationId" TEXT NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryDispositionCaseEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryDispositionCaseEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryDispositionCaseEvent_dispositionCaseId_fkey" FOREIGN KEY ("dispositionCaseId") REFERENCES "InventoryDispositionCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryDispositionCaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryDispositionCaseEvent_dispositionCaseId_version_key" ON "InventoryDispositionCaseEvent"("dispositionCaseId","version");
CREATE INDEX "InventoryDispositionCaseEvent_organizationId_occurredAt_idx" ON "InventoryDispositionCaseEvent"("organizationId","occurredAt");
CREATE INDEX "InventoryDispositionCaseEvent_actorUserId_occurredAt_idx" ON "InventoryDispositionCaseEvent"("actorUserId","occurredAt");
