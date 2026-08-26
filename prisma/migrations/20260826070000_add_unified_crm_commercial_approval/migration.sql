CREATE TYPE "UnifiedCrmCommercialApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'DENIED');

CREATE TYPE "UnifiedCrmCommercialApprovalDecisionType" AS ENUM ('APPROVED', 'RETURNED', 'DENIED');

CREATE TABLE "UnifiedCrmCommercialApprovalRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "quoteVersionNumber" INTEGER NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "status" "UnifiedCrmCommercialApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "purpose" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL,
  "policySnapshot" JSONB NOT NULL,
  "requestSnapshot" JSONB NOT NULL,
  "latestDecisionId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UnifiedCrmCommercialApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnifiedCrmCommercialApprovalDecision" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "decision" "UnifiedCrmCommercialApprovalDecisionType" NOT NULL,
  "decidedByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "decisionSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UnifiedCrmCommercialApprovalDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnifiedCrmCommercialApprovalRequest_latestDecisionId_key"
  ON "UnifiedCrmCommercialApprovalRequest"("latestDecisionId");

CREATE INDEX "UnifiedCrmCommercialApprovalRequest_organizationId_status_updatedAt_idx"
  ON "UnifiedCrmCommercialApprovalRequest"("organizationId", "status", "updatedAt");

CREATE INDEX "UnifiedCrmCommercialApprovalRequest_quoteId_quoteVersionNumber_idx"
  ON "UnifiedCrmCommercialApprovalRequest"("quoteId", "quoteVersionNumber");

CREATE INDEX "UnifiedCrmCommercialApprovalRequest_requestedByUserId_status_updatedAt_idx"
  ON "UnifiedCrmCommercialApprovalRequest"("requestedByUserId", "status", "updatedAt");

CREATE INDEX "UnifiedCrmCommercialApprovalDecision_organizationId_decision_createdAt_idx"
  ON "UnifiedCrmCommercialApprovalDecision"("organizationId", "decision", "createdAt");

CREATE INDEX "UnifiedCrmCommercialApprovalDecision_requestId_createdAt_idx"
  ON "UnifiedCrmCommercialApprovalDecision"("requestId", "createdAt");

CREATE INDEX "UnifiedCrmCommercialApprovalDecision_decidedByUserId_createdAt_idx"
  ON "UnifiedCrmCommercialApprovalDecision"("decidedByUserId", "createdAt");

ALTER TABLE "UnifiedCrmCommercialApprovalRequest"
  ADD CONSTRAINT "UnifiedCrmCommercialApprovalRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmCommercialApprovalRequest"
  ADD CONSTRAINT "UnifiedCrmCommercialApprovalRequest_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "UnifiedCrmQuoteRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmCommercialApprovalRequest"
  ADD CONSTRAINT "UnifiedCrmCommercialApprovalRequest_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmCommercialApprovalRequest"
  ADD CONSTRAINT "UnifiedCrmCommercialApprovalRequest_latestDecisionId_fkey"
  FOREIGN KEY ("latestDecisionId") REFERENCES "UnifiedCrmCommercialApprovalDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmCommercialApprovalDecision"
  ADD CONSTRAINT "UnifiedCrmCommercialApprovalDecision_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmCommercialApprovalDecision"
  ADD CONSTRAINT "UnifiedCrmCommercialApprovalDecision_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "UnifiedCrmCommercialApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmCommercialApprovalDecision"
  ADD CONSTRAINT "UnifiedCrmCommercialApprovalDecision_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
