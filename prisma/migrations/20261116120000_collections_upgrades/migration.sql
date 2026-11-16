-- CreateEnum
CREATE TYPE "CollectionExtensionType" AS ENUM ('EXTENSION', 'DEFERRAL', 'DUE_DATE_CHANGE');

-- CreateEnum
CREATE TYPE "CollectionExtensionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DECLINED', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollectionSkipAlertStatus" AS ENUM ('OPEN', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CollectionChargeOffStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountAdjustmentType" AS ENUM ('REPO_FEE', 'STORAGE_FEE', 'RETURNED_PAYMENT_FEE', 'OTHER_FEE', 'LATE_FEE_WAIVER', 'GOODWILL_CREDIT', 'OTHER_CREDIT');

-- CreateEnum
CREATE TYPE "AccountAdjustmentStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'DECLINED', 'POSTED_IN_DMS', 'CONFIRMED_BY_IMPORT', 'NOT_FOUND_IN_IMPORT', 'CANCELLED');

-- AlterTable
ALTER TABLE "CollectionAccount" ADD COLUMN     "riskScore" INTEGER,
ADD COLUMN     "riskScoredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentPromise" ADD COLUMN     "customerConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CollectionsPlaybook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionsPlaybook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRiskScore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "scoreDate" DATE NOT NULL,
    "score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "nextAction" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionRiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtensionRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "CollectionExtensionType" NOT NULL,
    "requestedTerms" TEXT NOT NULL,
    "newDueDate" DATE,
    "reason" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "eligibilityNotes" JSONB NOT NULL,
    "status" "CollectionExtensionStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT NOT NULL,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "overrideReason" TEXT,
    "appliedAt" TIMESTAMP(3),
    "appliedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtensionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSkipAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "status" "CollectionSkipAlertStatus" NOT NULL DEFAULT 'OPEN',
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "CollectionSkipAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSkipTraceEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionSkipTraceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRecoveryOutcome" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "repoCaseId" TEXT,
    "balanceAtRepoCents" INTEGER NOT NULL,
    "salePriceCents" INTEGER NOT NULL,
    "repoCostCents" INTEGER NOT NULL DEFAULT 0,
    "storageCostCents" INTEGER NOT NULL DEFAULT 0,
    "auctionCostCents" INTEGER NOT NULL DEFAULT 0,
    "otherCostCents" INTEGER NOT NULL DEFAULT 0,
    "deficiencyCents" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionRecoveryOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionChargeOff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "CollectionChargeOffStatus" NOT NULL DEFAULT 'REQUESTED',
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "overrideReason" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "recoveredCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionChargeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRecoveryPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "chargeOffId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "receivedDate" DATE NOT NULL,
    "method" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionRecoveryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountAdjustment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "AccountAdjustmentType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "documentId" TEXT,
    "status" "AccountAdjustmentStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "enteredByUserId" TEXT NOT NULL,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "baseline" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionsPlaybook_organizationId_isActive_idx" ON "CollectionsPlaybook"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionsPlaybook_organizationId_version_key" ON "CollectionsPlaybook"("organizationId", "version");

-- CreateIndex
CREATE INDEX "CollectionRiskScore_organizationId_scoreDate_idx" ON "CollectionRiskScore"("organizationId", "scoreDate");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRiskScore_accountId_scoreDate_key" ON "CollectionRiskScore"("accountId", "scoreDate");

-- CreateIndex
CREATE INDEX "ExtensionRequest_accountId_status_idx" ON "ExtensionRequest"("accountId", "status");

-- CreateIndex
CREATE INDEX "ExtensionRequest_organizationId_status_idx" ON "ExtensionRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CollectionSkipAlert_accountId_status_idx" ON "CollectionSkipAlert"("accountId", "status");

-- CreateIndex
CREATE INDEX "CollectionSkipAlert_organizationId_status_idx" ON "CollectionSkipAlert"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CollectionSkipTraceEntry_accountId_createdAt_idx" ON "CollectionSkipTraceEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionRecoveryOutcome_accountId_createdAt_idx" ON "CollectionRecoveryOutcome"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionChargeOff_accountId_status_idx" ON "CollectionChargeOff"("accountId", "status");

-- CreateIndex
CREATE INDEX "CollectionChargeOff_organizationId_status_idx" ON "CollectionChargeOff"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CollectionRecoveryPayment_chargeOffId_idx" ON "CollectionRecoveryPayment"("chargeOffId");

-- CreateIndex
CREATE INDEX "CollectionRecoveryPayment_accountId_idx" ON "CollectionRecoveryPayment"("accountId");

-- CreateIndex
CREATE INDEX "AccountAdjustment_accountId_status_idx" ON "AccountAdjustment"("accountId", "status");

-- CreateIndex
CREATE INDEX "AccountAdjustment_organizationId_status_idx" ON "AccountAdjustment"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "CollectionRiskScore" ADD CONSTRAINT "CollectionRiskScore_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSkipAlert" ADD CONSTRAINT "CollectionSkipAlert_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSkipTraceEntry" ADD CONSTRAINT "CollectionSkipTraceEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRecoveryOutcome" ADD CONSTRAINT "CollectionRecoveryOutcome_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionChargeOff" ADD CONSTRAINT "CollectionChargeOff_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRecoveryPayment" ADD CONSTRAINT "CollectionRecoveryPayment_chargeOffId_fkey" FOREIGN KEY ("chargeOffId") REFERENCES "CollectionChargeOff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountAdjustment" ADD CONSTRAINT "AccountAdjustment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

