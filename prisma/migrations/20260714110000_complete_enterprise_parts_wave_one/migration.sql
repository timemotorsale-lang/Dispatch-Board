-- CreateEnum
CREATE TYPE "PartCycleCountStatus" AS ENUM ('DRAFT', 'COUNTING', 'REVIEW_REQUIRED', 'APPROVED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartCycleCountMode" AS ENUM ('OBSERVE', 'FREEZE');

-- CreateEnum
CREATE TYPE "PartCycleCountType" AS ENUM ('FULL', 'CYCLE', 'SPOT');

-- CreateEnum
CREATE TYPE "PartRecommendationType" AS ENUM ('REORDER', 'TRANSFER_REVIEW', 'OBSOLESCENCE_REVIEW', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "PartRecommendationStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PartRecommendationConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PartBarcodeType" AS ENUM ('GTIN', 'UPC', 'OEM', 'INTERNAL', 'VENDOR');

-- CreateTable
CREATE TABLE "PartCycleCount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stockLocationId" TEXT NOT NULL,
    "countNumber" TEXT NOT NULL,
    "type" "PartCycleCountType" NOT NULL,
    "mode" "PartCycleCountMode" NOT NULL,
    "status" "PartCycleCountStatus" NOT NULL DEFAULT 'DRAFT',
    "blindCount" BOOLEAN NOT NULL DEFAULT true,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "ledgerCutoffAt" TIMESTAMP(3) NOT NULL,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartCycleCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartCycleCountLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cycleCountId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "snapshotQuantity" INTEGER NOT NULL,
    "expectedQuantity" INTEGER NOT NULL,
    "countedQuantity" INTEGER,
    "varianceQuantity" INTEGER,
    "expectedCostCents" INTEGER NOT NULL,
    "varianceValueCents" INTEGER,
    "counterUserId" TEXT,
    "countedAt" TIMESTAMP(3),
    "evidence" JSONB NOT NULL,
    "reasonCode" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedLedgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartCycleCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartCycleCountEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cycleCountId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fromStatus" "PartCycleCountStatus",
    "toStatus" "PartCycleCountStatus" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartCycleCountEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartInventoryPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "stockLocationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "abcClass" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "reviewPeriodDays" INTEGER NOT NULL,
    "targetServiceBasisPoints" INTEGER NOT NULL,
    "safetyStockQuantity" INTEGER NOT NULL,
    "reorderPointQuantity" INTEGER,
    "economicOrderQuantity" INTEGER,
    "maxStockQuantity" INTEGER,
    "orderingCostCents" INTEGER NOT NULL,
    "annualHoldingRateBasisPoints" INTEGER NOT NULL,
    "obsolescenceDays" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartInventoryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartRecommendationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartRecommendationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartInventoryRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "stockLocationId" TEXT NOT NULL,
    "type" "PartRecommendationType" NOT NULL,
    "status" "PartRecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "onHandQuantity" INTEGER NOT NULL,
    "allocatedQuantity" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "orderedQuantity" INTEGER NOT NULL,
    "averageDailyDemandMilli" INTEGER NOT NULL,
    "demandStdDevMilli" INTEGER NOT NULL,
    "daysSinceLastIssue" INTEGER,
    "safetyStockQuantity" INTEGER NOT NULL,
    "reorderPointQuantity" INTEGER NOT NULL,
    "economicOrderQuantity" INTEGER NOT NULL,
    "recommendedQuantity" INTEGER NOT NULL,
    "estimatedCostCents" INTEGER NOT NULL,
    "confidence" "PartRecommendationConfidence" NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "decidedByUserId" TEXT,
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartInventoryRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartBarcodeAlias" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "type" "PartBarcodeType" NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceReference" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartBarcodeAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartCycleCount_organizationId_status_snapshotAt_idx" ON "PartCycleCount"("organizationId", "status", "snapshotAt");

-- CreateIndex
CREATE INDEX "PartCycleCount_stockLocationId_status_idx" ON "PartCycleCount"("stockLocationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartCycleCount_organizationId_countNumber_key" ON "PartCycleCount"("organizationId", "countNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PartCycleCountLine_postedLedgerEntryId_key" ON "PartCycleCountLine"("postedLedgerEntryId");

-- CreateIndex
CREATE INDEX "PartCycleCountLine_organizationId_approvalRequired_countedA_idx" ON "PartCycleCountLine"("organizationId", "approvalRequired", "countedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartCycleCountLine_cycleCountId_partId_key" ON "PartCycleCountLine"("cycleCountId", "partId");

-- CreateIndex
CREATE INDEX "PartCycleCountEvent_organizationId_occurredAt_idx" ON "PartCycleCountEvent"("organizationId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartCycleCountEvent_cycleCountId_version_key" ON "PartCycleCountEvent"("cycleCountId", "version");

-- CreateIndex
CREATE INDEX "PartInventoryPolicy_organizationId_isActive_effectiveFrom_e_idx" ON "PartInventoryPolicy"("organizationId", "isActive", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "PartInventoryPolicy_partId_stockLocationId_version_key" ON "PartInventoryPolicy"("partId", "stockLocationId", "version");

-- CreateIndex
CREATE INDEX "PartRecommendationRun_organizationId_generatedAt_idx" ON "PartRecommendationRun"("organizationId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartRecommendationRun_organizationId_sourceFingerprint_key" ON "PartRecommendationRun"("organizationId", "sourceFingerprint");

-- CreateIndex
CREATE INDEX "PartInventoryRecommendation_organizationId_status_type_crea_idx" ON "PartInventoryRecommendation"("organizationId", "status", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartInventoryRecommendation_runId_partId_stockLocationId_ty_key" ON "PartInventoryRecommendation"("runId", "partId", "stockLocationId", "type");

-- CreateIndex
CREATE INDEX "PartBarcodeAlias_partId_isActive_idx" ON "PartBarcodeAlias"("partId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PartBarcodeAlias_organizationId_code_key" ON "PartBarcodeAlias"("organizationId", "code");

-- AddForeignKey
ALTER TABLE "PartCycleCount" ADD CONSTRAINT "PartCycleCount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCount" ADD CONSTRAINT "PartCycleCount_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCount" ADD CONSTRAINT "PartCycleCount_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCount" ADD CONSTRAINT "PartCycleCount_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountLine" ADD CONSTRAINT "PartCycleCountLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountLine" ADD CONSTRAINT "PartCycleCountLine_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "PartCycleCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountLine" ADD CONSTRAINT "PartCycleCountLine_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountLine" ADD CONSTRAINT "PartCycleCountLine_counterUserId_fkey" FOREIGN KEY ("counterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountLine" ADD CONSTRAINT "PartCycleCountLine_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountLine" ADD CONSTRAINT "PartCycleCountLine_postedLedgerEntryId_fkey" FOREIGN KEY ("postedLedgerEntryId") REFERENCES "PartStockLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountEvent" ADD CONSTRAINT "PartCycleCountEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountEvent" ADD CONSTRAINT "PartCycleCountEvent_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "PartCycleCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCycleCountEvent" ADD CONSTRAINT "PartCycleCountEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryPolicy" ADD CONSTRAINT "PartInventoryPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryPolicy" ADD CONSTRAINT "PartInventoryPolicy_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryPolicy" ADD CONSTRAINT "PartInventoryPolicy_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryPolicy" ADD CONSTRAINT "PartInventoryPolicy_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRecommendationRun" ADD CONSTRAINT "PartRecommendationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRecommendationRun" ADD CONSTRAINT "PartRecommendationRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRecommendationRun" ADD CONSTRAINT "PartRecommendationRun_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryRecommendation" ADD CONSTRAINT "PartInventoryRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryRecommendation" ADD CONSTRAINT "PartInventoryRecommendation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PartRecommendationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryRecommendation" ADD CONSTRAINT "PartInventoryRecommendation_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryRecommendation" ADD CONSTRAINT "PartInventoryRecommendation_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInventoryRecommendation" ADD CONSTRAINT "PartInventoryRecommendation_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartBarcodeAlias" ADD CONSTRAINT "PartBarcodeAlias_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartBarcodeAlias" ADD CONSTRAINT "PartBarcodeAlias_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartBarcodeAlias" ADD CONSTRAINT "PartBarcodeAlias_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Wave 1 enterprise invariants
ALTER TABLE "PartCycleCount"
  ADD CONSTRAINT "PartCycleCount_timeline_check" CHECK ("ledgerCutoffAt" <= "snapshotAt" AND "version" > 0),
  ADD CONSTRAINT "PartCycleCount_status_time_check" CHECK (
    ("status" = 'DRAFT' AND "startedAt" IS NULL AND "submittedAt" IS NULL AND "postedAt" IS NULL AND "cancelledAt" IS NULL)
    OR ("status" = 'COUNTING' AND "startedAt" IS NOT NULL AND "submittedAt" IS NULL AND "postedAt" IS NULL AND "cancelledAt" IS NULL)
    OR ("status" IN ('REVIEW_REQUIRED','APPROVED') AND "startedAt" IS NOT NULL AND "submittedAt" IS NOT NULL AND "postedAt" IS NULL AND "cancelledAt" IS NULL)
    OR ("status" = 'POSTED' AND "startedAt" IS NOT NULL AND "submittedAt" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "postedAt" IS NOT NULL AND "cancelledAt" IS NULL)
    OR ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "postedAt" IS NULL)
  );

CREATE UNIQUE INDEX "PartCycleCount_one_active_location_key"
  ON "PartCycleCount" ("organizationId","stockLocationId")
  WHERE "status" IN ('COUNTING','REVIEW_REQUIRED','APPROVED');

ALTER TABLE "PartCycleCountLine"
  ADD CONSTRAINT "PartCycleCountLine_quantities_check" CHECK (
    "snapshotQuantity" >= 0 AND "expectedQuantity" >= 0 AND "expectedCostCents" >= 0
    AND ("countedQuantity" IS NULL OR "countedQuantity" >= 0)
    AND (("countedQuantity" IS NULL AND "varianceQuantity" IS NULL AND "varianceValueCents" IS NULL AND "counterUserId" IS NULL AND "countedAt" IS NULL)
      OR ("countedQuantity" IS NOT NULL AND "varianceQuantity" = "countedQuantity" - "expectedQuantity" AND "varianceValueCents" = "varianceQuantity" * "expectedCostCents" AND "counterUserId" IS NOT NULL AND "countedAt" IS NOT NULL))
  ),
  ADD CONSTRAINT "PartCycleCountLine_evidence_check" CHECK (jsonb_typeof("evidence") = 'array'),
  ADD CONSTRAINT "PartCycleCountLine_approval_flag_check" CHECK (
    ("varianceQuantity" IS NULL AND "approvalRequired" = FALSE)
    OR ("varianceQuantity" = 0 AND "approvalRequired" = FALSE)
    OR ("varianceQuantity" <> 0 AND "approvalRequired" = TRUE)
  ),
  ADD CONSTRAINT "PartCycleCountLine_approval_check" CHECK (
    ("approvedByUserId" IS NULL AND "approvedAt" IS NULL)
    OR ("approvedByUserId" IS NOT NULL AND "approvedAt" IS NOT NULL AND "counterUserId" IS DISTINCT FROM "approvedByUserId")
  );

ALTER TABLE "PartCycleCountEvent" ADD CONSTRAINT "PartCycleCountEvent_version_check" CHECK ("version" > 0);

ALTER TABLE "PartInventoryPolicy"
  ADD CONSTRAINT "PartInventoryPolicy_values_check" CHECK (
    "version" > 0 AND "leadTimeDays" >= 0 AND "reviewPeriodDays" > 0
    AND "targetServiceBasisPoints" BETWEEN 0 AND 10000
    AND "safetyStockQuantity" >= 0
    AND ("reorderPointQuantity" IS NULL OR "reorderPointQuantity" >= 0)
    AND ("economicOrderQuantity" IS NULL OR "economicOrderQuantity" > 0)
    AND ("maxStockQuantity" IS NULL OR "maxStockQuantity" > 0)
    AND "orderingCostCents" >= 0
    AND "annualHoldingRateBasisPoints" BETWEEN 0 AND 10000
    AND "obsolescenceDays" > 0
    AND "abcClass" IN ('A','B','C')
  ),
  ADD CONSTRAINT "PartInventoryPolicy_effective_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");

CREATE UNIQUE INDEX "PartInventoryPolicy_one_active_key"
  ON "PartInventoryPolicy" ("partId","stockLocationId")
  WHERE "isActive" = TRUE;

ALTER TABLE "PartRecommendationRun"
  ADD CONSTRAINT "PartRecommendationRun_window_check" CHECK ("windowEnd" > "windowStart" AND "generatedAt" >= "windowStart"),
  ADD CONSTRAINT "PartRecommendationRun_policy_snapshot_check" CHECK (jsonb_typeof("policySnapshot") = 'array');

ALTER TABLE "PartInventoryRecommendation"
  ADD CONSTRAINT "PartInventoryRecommendation_values_check" CHECK (
    "version" > 0 AND "onHandQuantity" >= 0 AND "allocatedQuantity" >= 0 AND "availableQuantity" >= 0
    AND "orderedQuantity" >= 0 AND "averageDailyDemandMilli" >= 0 AND "demandStdDevMilli" >= 0
    AND ("daysSinceLastIssue" IS NULL OR "daysSinceLastIssue" >= 0)
    AND "safetyStockQuantity" >= 0 AND "reorderPointQuantity" >= 0 AND "economicOrderQuantity" > 0
    AND "recommendedQuantity" >= 0 AND "estimatedCostCents" >= 0
  ),
  ADD CONSTRAINT "PartInventoryRecommendation_json_check" CHECK (jsonb_typeof("reasonCodes") = 'array' AND jsonb_typeof("evidence") = 'object'),
  ADD CONSTRAINT "PartInventoryRecommendation_action_check" CHECK (
    ("type" = 'NO_ACTION' AND "recommendedQuantity" = 0)
    OR ("type" IN ('REORDER','TRANSFER_REVIEW') AND "recommendedQuantity" > 0)
    OR ("type" = 'OBSOLESCENCE_REVIEW')
  ),
  ADD CONSTRAINT "PartInventoryRecommendation_decision_check" CHECK (
    ("status" = 'OPEN' AND "decidedByUserId" IS NULL AND "decisionReason" IS NULL AND "decidedAt" IS NULL)
    OR ("status" IN ('ACKNOWLEDGED','DISMISSED') AND "decidedByUserId" IS NOT NULL AND "decisionReason" IS NOT NULL AND length(btrim("decisionReason")) > 0 AND "decidedAt" IS NOT NULL)
  );

ALTER TABLE "PartBarcodeAlias"
  ADD CONSTRAINT "PartBarcodeAlias_code_check" CHECK (length("code") >= 3 AND "code" = upper("code") AND "code" !~ '\\s');

CREATE FUNCTION prevent_parts_wave_one_evidence_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PartCycleCountEvent_prevent_mutation" BEFORE UPDATE OR DELETE ON "PartCycleCountEvent" FOR EACH ROW EXECUTE FUNCTION prevent_parts_wave_one_evidence_mutation();
CREATE TRIGGER "PartRecommendationRun_prevent_mutation" BEFORE UPDATE OR DELETE ON "PartRecommendationRun" FOR EACH ROW EXECUTE FUNCTION prevent_parts_wave_one_evidence_mutation();

CREATE FUNCTION prevent_frozen_part_stock_movement() RETURNS trigger AS $$
BEGIN
  IF NEW."sourceType" <> 'CYCLE_COUNT_ADJUSTMENT' AND EXISTS (
    SELECT 1 FROM "PartCycleCount"
    WHERE "organizationId" = NEW."organizationId"
      AND "stockLocationId" = NEW."stockLocationId"
      AND "mode" = 'FREEZE'
      AND "status" IN ('COUNTING','REVIEW_REQUIRED','APPROVED')
  ) THEN
    RAISE EXCEPTION 'Stock location is frozen by an active cycle count';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PartStockLedgerEntry_prevent_frozen_movement"
  BEFORE INSERT ON "PartStockLedgerEntry"
  FOR EACH ROW EXECUTE FUNCTION prevent_frozen_part_stock_movement();

