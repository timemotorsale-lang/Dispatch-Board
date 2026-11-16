-- CreateEnum
CREATE TYPE "ServicingCalcMethod" AS ENUM ('FIXED_PAYMENT', 'SIMPLE_INTEREST');

-- CreateEnum
CREATE TYPE "ServicingContractSource" AS ENUM ('DEAL', 'DMS_MIGRATION', 'MANUAL');

-- CreateEnum
CREATE TYPE "ServicingContractStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'CHARGED_OFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('PAYMENT', 'PAYMENT_REVERSAL', 'RETURNED_PAYMENT', 'LATE_FEE', 'LATE_FEE_WAIVER', 'FEE', 'CREDIT', 'ADJUSTMENT', 'PAYOFF', 'CHARGE_OFF', 'RECOVERY', 'REPO_EXPENSE', 'SALE_PROCEEDS', 'SIDE_NOTE_PAYMENT', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "LedgerTransactionSource" AS ENUM ('CASH_DRAWER', 'PROCESSOR', 'ZELLE', 'MONEY_ORDER', 'IMPORT', 'SYSTEM', 'MANUAL');

-- CreateEnum
CREATE TYPE "LedgerAllocationBucket" AS ENUM ('FEE', 'LATE_FEE', 'INTEREST', 'INSTALLMENT', 'PRINCIPAL', 'SIDE_NOTE', 'UNAPPLIED');

-- CreateTable
CREATE TABLE "ServicingContract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountType" "CollectionAccountType" NOT NULL,
    "calcMethod" "ServicingCalcMethod" NOT NULL,
    "cashPriceCents" INTEGER NOT NULL DEFAULT 0,
    "downPaymentCents" INTEGER NOT NULL DEFAULT 0,
    "sideNoteCents" INTEGER NOT NULL DEFAULT 0,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "amountFinancedCents" INTEGER NOT NULL,
    "totalOfPaymentsCents" INTEGER NOT NULL,
    "aprBasisPoints" INTEGER,
    "paymentAmountCents" INTEGER NOT NULL,
    "frequency" "CollectionPaymentFrequency" NOT NULL,
    "numberOfPayments" INTEGER NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "contractDate" DATE NOT NULL,
    "ownershipRule" TEXT NOT NULL DEFAULT 'OWNS_AFTER_LAST_PAYMENT',
    "source" "ServicingContractSource" NOT NULL,
    "status" "ServicingContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicingContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledInstallment" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "principalCents" INTEGER,
    "interestCents" INTEGER,

    CONSTRAINT "ScheduledInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "LedgerTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "LedgerTransactionSource" NOT NULL,
    "referenceNumber" TEXT,
    "memo" TEXT NOT NULL DEFAULT '',
    "enteredByUserId" TEXT,
    "approvedByUserId" TEXT,
    "reversesTransactionId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAllocation" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "bucket" "LedgerAllocationBucket" NOT NULL,
    "installmentNumber" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServicingContract_accountId_key" ON "ServicingContract"("accountId");

-- CreateIndex
CREATE INDEX "ServicingContract_organizationId_status_idx" ON "ServicingContract"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PaymentSchedule_contractId_isCurrent_idx" ON "PaymentSchedule"("contractId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSchedule_contractId_version_key" ON "PaymentSchedule"("contractId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledInstallment_scheduleId_number_key" ON "ScheduledInstallment"("scheduleId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_idempotencyKey_key" ON "LedgerTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerTransaction_contractId_effectiveDate_idx" ON "LedgerTransaction"("contractId", "effectiveDate");

-- CreateIndex
CREATE INDEX "LedgerTransaction_accountId_effectiveDate_idx" ON "LedgerTransaction"("accountId", "effectiveDate");

-- CreateIndex
CREATE INDEX "LedgerTransaction_reversesTransactionId_idx" ON "LedgerTransaction"("reversesTransactionId");

-- CreateIndex
CREATE INDEX "LedgerAllocation_transactionId_idx" ON "LedgerAllocation"("transactionId");

-- AddForeignKey
ALTER TABLE "ServicingContract" ADD CONSTRAINT "ServicingContract_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSchedule" ADD CONSTRAINT "PaymentSchedule_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ServicingContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledInstallment" ADD CONSTRAINT "ScheduledInstallment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PaymentSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ServicingContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAllocation" ADD CONSTRAINT "LedgerAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

