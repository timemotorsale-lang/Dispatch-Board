CREATE TYPE "InventoryRetailCompletionStage" AS ENUM ('AVAILABLE_FOR_SALE','RESERVED_DEAL_PENDING','SALE_AUTHORIZATION','DELIVERY_READINESS','DELIVERY_HOLD','SOLD_AWAITING_DELIVERY','RECONCILIATION_HOLD','DELIVERED_RECONCILED','UNWIND_REVIEW','CANCELLED');
CREATE TYPE "InventoryRetailCompletionOperatingState" AS ENUM ('ACTIVE','WAITING','BLOCKED','COMPLETED','CANCELLED');
CREATE TABLE "InventoryRetailCompletion" (
  "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"locationId" TEXT NOT NULL,"inventoryUnitId" TEXT NOT NULL,"ownerUserId" TEXT NOT NULL,"workflowVersion" TEXT NOT NULL,"policyVersion" TEXT NOT NULL,
  "stage" "InventoryRetailCompletionStage" NOT NULL DEFAULT 'AVAILABLE_FOR_SALE',"operatingState" "InventoryRetailCompletionOperatingState" NOT NULL DEFAULT 'ACTIVE',
  "availabilitySnapshot" JSONB NOT NULL,"reservationSnapshot" JSONB NOT NULL,"saleAuthorizationSnapshot" JSONB NOT NULL,"deliveryReadinessSnapshot" JSONB NOT NULL,"deliverySnapshot" JSONB NOT NULL,"unwindSnapshot" JSONB NOT NULL,"reconciliationSnapshot" JSONB NOT NULL,"exceptionSnapshot" JSONB NOT NULL,
  "targetAt" TIMESTAMP(3) NOT NULL,"nextAction" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryRetailCompletion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryRetailCompletion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryRetailCompletion_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryRetailCompletion_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryRetailCompletion_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryRetailCompletion_inventoryUnitId_key" ON "InventoryRetailCompletion"("inventoryUnitId");
CREATE INDEX "InventoryRetailCompletion_organizationId_stage_operatingState_targetAt_idx" ON "InventoryRetailCompletion"("organizationId","stage","operatingState","targetAt");
CREATE INDEX "InventoryRetailCompletion_organizationId_locationId_stage_idx" ON "InventoryRetailCompletion"("organizationId","locationId","stage");
CREATE INDEX "InventoryRetailCompletion_ownerUserId_operatingState_targetAt_idx" ON "InventoryRetailCompletion"("ownerUserId","operatingState","targetAt");
CREATE TABLE "InventoryRetailCompletionEvent" (
  "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"completionId" TEXT NOT NULL,"version" INTEGER NOT NULL,"fromStage" "InventoryRetailCompletionStage","toStage" "InventoryRetailCompletionStage" NOT NULL,"fromState" "InventoryRetailCompletionOperatingState","toState" "InventoryRetailCompletionOperatingState" NOT NULL,"commandType" TEXT NOT NULL,"snapshot" JSONB NOT NULL,"actorUserId" TEXT NOT NULL,"reason" TEXT NOT NULL,"correlationId" TEXT NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryRetailCompletionEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryRetailCompletionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryRetailCompletionEvent_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "InventoryRetailCompletion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryRetailCompletionEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryRetailCompletionEvent_completionId_version_key" ON "InventoryRetailCompletionEvent"("completionId","version");
CREATE INDEX "InventoryRetailCompletionEvent_organizationId_occurredAt_idx" ON "InventoryRetailCompletionEvent"("organizationId","occurredAt");
CREATE INDEX "InventoryRetailCompletionEvent_correlationId_idx" ON "InventoryRetailCompletionEvent"("correlationId");
