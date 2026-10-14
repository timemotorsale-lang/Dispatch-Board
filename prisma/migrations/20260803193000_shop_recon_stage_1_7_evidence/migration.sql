ALTER TYPE "ShopReconLifecycleEventType" ADD VALUE 'STAGE_EVIDENCE_PUBLISHED' AFTER 'DRAFT_SAVED';

CREATE TABLE "ShopReconStageEvidence" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "lifecycleId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "stage" "ShopReconLifecycleStage" NOT NULL,
  "scopeVersion" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "sourceReferences" JSONB NOT NULL,
  "publishedByUserId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  CONSTRAINT "ShopReconStageEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopReconStageEvidence_lifecycleId_stage_scopeVersion_version_key" ON "ShopReconStageEvidence"("lifecycleId", "stage", "scopeVersion", "version");
CREATE INDEX "ShopReconStageEvidence_repairOrderId_stage_publishedAt_idx" ON "ShopReconStageEvidence"("repairOrderId", "stage", "publishedAt");
CREATE INDEX "ShopReconStageEvidence_publishedByUserId_publishedAt_idx" ON "ShopReconStageEvidence"("publishedByUserId", "publishedAt");

ALTER TABLE "ShopReconStageEvidence" ADD CONSTRAINT "ShopReconStageEvidence_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "ShopReconLifecycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
