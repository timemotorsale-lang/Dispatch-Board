-- CreateEnum
CREATE TYPE "ShopReconParallelOperationStatus" AS ENUM ('IN_PROGRESS', 'BLOCKED', 'READY_FOR_INVENTORY_REVIEW', 'REVALIDATION_REQUIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ShopReconParallelOperation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lifecycleId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "inventoryUnitId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "operationCode" TEXT NOT NULL,
    "status" "ShopReconParallelOperationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "ownerUserId" TEXT NOT NULL,
    "sourceVin" TEXT,
    "sourceScopeVersion" INTEGER NOT NULL,
    "checklist" JSONB NOT NULL,
    "evidenceReferences" JSONB NOT NULL,
    "blockerNote" TEXT,
    "handoffNote" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "lastValidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopReconParallelOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopReconParallelOperation_lifecycleId_operationCode_key" ON "ShopReconParallelOperation"("lifecycleId", "operationCode");
CREATE INDEX "ShopReconParallelOperation_organizationId_status_updatedAt_idx" ON "ShopReconParallelOperation"("organizationId", "status", "updatedAt");
CREATE INDEX "ShopReconParallelOperation_repairOrderId_operationCode_idx" ON "ShopReconParallelOperation"("repairOrderId", "operationCode");
CREATE INDEX "ShopReconParallelOperation_ownerUserId_status_idx" ON "ShopReconParallelOperation"("ownerUserId", "status");
ALTER TABLE "ShopReconParallelOperation" ADD CONSTRAINT "ShopReconParallelOperation_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "ShopReconLifecycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
