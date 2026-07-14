CREATE TYPE "InventoryAppraisalConfidence" AS ENUM ('LOW','MEDIUM','HIGH','UNKNOWN');
CREATE TYPE "InventoryAcquisitionDecisionStatus" AS ENUM ('DRAFT','RECOMMENDED','APPROVED','DECLINED','SUPERSEDED');
CREATE TYPE "InventoryPurchaseAuthorizationStatus" AS ENUM ('PENDING','APPROVED','REJECTED','EXPIRED','REVOKED');
CREATE TYPE "InventoryReceiptStatus" AS ENUM ('PLANNED','IN_TRANSIT','RECEIVED','EXCEPTION','CANCELLED');
CREATE TYPE "InventoryTitleReadinessStatus" AS ENUM ('NOT_STARTED','INCOMPLETE','READY','BLOCKED','EXPIRED');

CREATE TABLE "InventoryAcquisitionAppraisal" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "inventoryUnitId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "conditionSummary" JSONB NOT NULL, "comparableSnapshot" JSONB NOT NULL,
  "evidenceObjectIds" JSONB NOT NULL, "confidence" "InventoryAppraisalConfidence" NOT NULL DEFAULT 'UNKNOWN',
  "estimatedRetailCents" INTEGER, "estimatedReconCents" INTEGER, "estimatedFeesCents" INTEGER,
  "decisionStatus" "InventoryAcquisitionDecisionStatus" NOT NULL DEFAULT 'DRAFT', "decisionReason" TEXT,
  "evaluatedAt" TIMESTAMP(3) NOT NULL, "createdByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryAcquisitionAppraisal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryAcquisitionAppraisal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryAcquisitionAppraisal_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryAcquisitionAppraisal_inventoryUnitId_version_key" ON "InventoryAcquisitionAppraisal"("inventoryUnitId","version");
CREATE INDEX "InventoryAcquisitionAppraisal_organizationId_decisionStatus_evaluatedAt_idx" ON "InventoryAcquisitionAppraisal"("organizationId","decisionStatus","evaluatedAt");

CREATE TABLE "InventoryPurchaseAuthorization" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "inventoryUnitId" TEXT NOT NULL, "appraisalId" TEXT,
  "version" INTEGER NOT NULL, "maximumBidCents" INTEGER NOT NULL, "authorityLimitCents" INTEGER,
  "status" "InventoryPurchaseAuthorizationStatus" NOT NULL DEFAULT 'PENDING', "evidenceObjectIds" JSONB NOT NULL,
  "reason" TEXT NOT NULL, "decidedByUserId" TEXT, "decidedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryPurchaseAuthorization_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryPurchaseAuthorization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryPurchaseAuthorization_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryPurchaseAuthorization_inventoryUnitId_version_key" ON "InventoryPurchaseAuthorization"("inventoryUnitId","version");
CREATE INDEX "InventoryPurchaseAuthorization_organizationId_status_expiresAt_idx" ON "InventoryPurchaseAuthorization"("organizationId","status","expiresAt");

CREATE TABLE "InventoryReceipt" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "inventoryUnitId" TEXT NOT NULL, "status" "InventoryReceiptStatus" NOT NULL DEFAULT 'PLANNED',
  "source" TEXT NOT NULL, "transportReference" TEXT, "carrier" TEXT, "dispatchedAt" TIMESTAMP(3), "arrivedAt" TIMESTAMP(3), "custodyFrom" TEXT, "custodyTo" TEXT,
  "damageSummary" TEXT, "keyCount" INTEGER, "documentSummary" JSONB NOT NULL, "evidenceObjectIds" JSONB NOT NULL, "exceptionReason" TEXT,
  "recordedByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryReceipt_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InventoryReceipt_organizationId_status_arrivedAt_idx" ON "InventoryReceipt"("organizationId","status","arrivedAt");
CREATE INDEX "InventoryReceipt_inventoryUnitId_createdAt_idx" ON "InventoryReceipt"("inventoryUnitId","createdAt");

CREATE TABLE "InventoryReconHandoff" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "inventoryUnitId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "inspectionVersion" INTEGER NOT NULL,
  "planSnapshot" JSONB NOT NULL, "evidenceObjectIds" JSONB NOT NULL, "handedOffByUserId" TEXT NOT NULL, "handedOffAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryReconHandoff_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryReconHandoff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryReconHandoff_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryReconHandoff_inventoryUnitId_inspectionVersion_key" ON "InventoryReconHandoff"("inventoryUnitId","inspectionVersion");
CREATE INDEX "InventoryReconHandoff_organizationId_handedOffAt_idx" ON "InventoryReconHandoff"("organizationId","handedOffAt");
CREATE INDEX "InventoryReconHandoff_repairOrderId_idx" ON "InventoryReconHandoff"("repairOrderId");

CREATE TABLE "InventoryTitleReadiness" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "inventoryUnitId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" "InventoryTitleReadinessStatus" NOT NULL DEFAULT 'NOT_STARTED', "requiredDocuments" JSONB NOT NULL, "documentStatuses" JSONB NOT NULL,
  "evidenceObjectIds" JSONB NOT NULL, "externalDependencies" JSONB NOT NULL, "blockerReasons" JSONB NOT NULL, "ownerUserId" TEXT NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTitleReadiness_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryTitleReadiness_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryTitleReadiness_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryTitleReadiness_inventoryUnitId_version_key" ON "InventoryTitleReadiness"("inventoryUnitId","version");
CREATE INDEX "InventoryTitleReadiness_organizationId_status_evaluatedAt_idx" ON "InventoryTitleReadiness"("organizationId","status","evaluatedAt");

CREATE TABLE "InventoryUnitCost" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "inventoryUnitId" TEXT NOT NULL,
  "category" TEXT NOT NULL, "amountCents" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'ESTIMATED', "source" TEXT NOT NULL, "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "incurredAt" TIMESTAMP(3), "recoveredAt" TIMESTAMP(3),
  "reference" TEXT, "notes" TEXT, "createdByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryUnitCost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryUnitCost_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InventoryUnitCost_organizationId_inventoryUnitId_category_observedAt_idx" ON "InventoryUnitCost"("organizationId","inventoryUnitId","category","observedAt");
CREATE INDEX "InventoryUnitCost_organizationId_status_observedAt_idx" ON "InventoryUnitCost"("organizationId","status","observedAt");

CREATE TABLE "InventoryLifecyclePolicy" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "policyCode" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "configuration" JSONB NOT NULL, "effectiveFrom" TIMESTAMP(3), "effectiveTo" TIMESTAMP(3),
  "approvedByUserId" TEXT, "approvedAt" TIMESTAMP(3), "activatedByUserId" TEXT, "activatedAt" TIMESTAMP(3),
  "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryLifecyclePolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryLifecyclePolicy_organizationId_policyCode_version_key" ON "InventoryLifecyclePolicy"("organizationId","policyCode","version");
CREATE INDEX "InventoryLifecyclePolicy_organizationId_policyCode_status_effectiveFrom_idx" ON "InventoryLifecyclePolicy"("organizationId","policyCode","status","effectiveFrom");

CREATE TABLE "InventoryMerchandisingPackage" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "inventoryUnitId" TEXT NOT NULL,
  "description" TEXT, "priceCents" INTEGER, "photoReferences" JSONB NOT NULL, "listingChannels" JSONB NOT NULL,
  "frontlineReady" BOOLEAN NOT NULL DEFAULT false, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryMerchandisingPackage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMerchandisingPackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryMerchandisingPackage_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryMerchandisingPackage_inventoryUnitId_key" ON "InventoryMerchandisingPackage"("inventoryUnitId");
CREATE INDEX "InventoryMerchandisingPackage_organizationId_frontlineReady_idx" ON "InventoryMerchandisingPackage"("organizationId","frontlineReady");

CREATE TABLE "InventorySaleEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "inventoryUnitId" TEXT NOT NULL, "eventType" TEXT NOT NULL,
  "reference" TEXT, "reason" TEXT NOT NULL, "actorUserId" TEXT NOT NULL, "metadata" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventorySaleEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventorySaleEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventorySaleEvent_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InventorySaleEvent_organizationId_inventoryUnitId_occurredAt_idx" ON "InventorySaleEvent"("organizationId","inventoryUnitId","occurredAt");
