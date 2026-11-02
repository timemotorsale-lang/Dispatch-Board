-- CreateTable
CREATE TABLE "VendorBillingAgreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "principalCents" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "ownerUserId" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBillingAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillingDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'INVOICE',
    "number" TEXT NOT NULL,
    "normalizedNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "agreementId" TEXT,
    "periodKey" TEXT,
    "sourceReference" TEXT NOT NULL,
    "unmatchedReason" TEXT NOT NULL DEFAULT '',
    "disputeReason" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBillingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillingLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "workJobId" TEXT,

    CONSTRAINT "VendorBillingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillingDueItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "agreementId" TEXT,
    "periodKey" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,

    CONSTRAINT "VendorBillingDueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillingSettlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reversalOfId" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "reconciliationReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBillingSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillingAllocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "effectiveDate" DATE NOT NULL,

    CONSTRAINT "VendorBillingAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillingWorkReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "workJobId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "repairOrderId" TEXT,
    "approvedAmountCents" INTEGER NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "scopeSnapshot" JSONB NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewedById" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBillingWorkReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillingEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "commandKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorBillingAgreement_organizationId_vendorId_active_idx" ON "VendorBillingAgreement"("organizationId", "vendorId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingAgreement_organizationId_vendorId_id_key" ON "VendorBillingAgreement"("organizationId", "vendorId", "id");

-- CreateIndex
CREATE INDEX "VendorBillingDocument_organizationId_vendorId_status_dueDat_idx" ON "VendorBillingDocument"("organizationId", "vendorId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingDocument_organizationId_vendorId_id_key" ON "VendorBillingDocument"("organizationId", "vendorId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingDocument_organizationId_vendorId_direction_nor_key" ON "VendorBillingDocument"("organizationId", "vendorId", "direction", "normalizedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingDocument_agreementId_periodKey_key" ON "VendorBillingDocument"("agreementId", "periodKey");

-- CreateIndex
CREATE INDEX "VendorBillingLine_organizationId_vendorId_workJobId_idx" ON "VendorBillingLine"("organizationId", "vendorId", "workJobId");

-- CreateIndex
CREATE INDEX "VendorBillingDueItem_organizationId_vendorId_dueDate_idx" ON "VendorBillingDueItem"("organizationId", "vendorId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingDueItem_documentId_periodKey_key" ON "VendorBillingDueItem"("documentId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingSettlement_reversalOfId_key" ON "VendorBillingSettlement"("reversalOfId");

-- CreateIndex
CREATE INDEX "VendorBillingSettlement_organizationId_vendorId_date_idx" ON "VendorBillingSettlement"("organizationId", "vendorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingSettlement_organizationId_vendorId_id_key" ON "VendorBillingSettlement"("organizationId", "vendorId", "id");

-- CreateIndex
CREATE INDEX "VendorBillingAllocation_settlementId_documentId_idx" ON "VendorBillingAllocation"("settlementId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingWorkReview_organizationId_vendorId_workJobId_key" ON "VendorBillingWorkReview"("organizationId", "vendorId", "workJobId");

-- CreateIndex
CREATE INDEX "VendorBillingEvent_organizationId_vendorId_createdAt_idx" ON "VendorBillingEvent"("organizationId", "vendorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillingEvent_organizationId_vendorId_commandKey_key" ON "VendorBillingEvent"("organizationId", "vendorId", "commandKey");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_organizationId_id_key" ON "Vendor"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "VendorBillingAgreement" ADD CONSTRAINT "VendorBillingAgreement_organizationId_vendorId_fkey" FOREIGN KEY ("organizationId", "vendorId") REFERENCES "Vendor"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingDocument" ADD CONSTRAINT "VendorBillingDocument_organizationId_vendorId_fkey" FOREIGN KEY ("organizationId", "vendorId") REFERENCES "Vendor"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingDocument" ADD CONSTRAINT "VendorBillingDocument_organizationId_vendorId_agreementId_fkey" FOREIGN KEY ("organizationId", "vendorId", "agreementId") REFERENCES "VendorBillingAgreement"("organizationId", "vendorId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingLine" ADD CONSTRAINT "VendorBillingLine_organizationId_vendorId_documentId_fkey" FOREIGN KEY ("organizationId", "vendorId", "documentId") REFERENCES "VendorBillingDocument"("organizationId", "vendorId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingDueItem" ADD CONSTRAINT "VendorBillingDueItem_organizationId_vendorId_documentId_fkey" FOREIGN KEY ("organizationId", "vendorId", "documentId") REFERENCES "VendorBillingDocument"("organizationId", "vendorId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingDueItem" ADD CONSTRAINT "VendorBillingDueItem_organizationId_vendorId_agreementId_fkey" FOREIGN KEY ("organizationId", "vendorId", "agreementId") REFERENCES "VendorBillingAgreement"("organizationId", "vendorId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingSettlement" ADD CONSTRAINT "VendorBillingSettlement_organizationId_vendorId_fkey" FOREIGN KEY ("organizationId", "vendorId") REFERENCES "Vendor"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingAllocation" ADD CONSTRAINT "VendorBillingAllocation_organizationId_vendorId_documentId_fkey" FOREIGN KEY ("organizationId", "vendorId", "documentId") REFERENCES "VendorBillingDocument"("organizationId", "vendorId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingAllocation" ADD CONSTRAINT "VendorBillingAllocation_organizationId_vendorId_settlement_fkey" FOREIGN KEY ("organizationId", "vendorId", "settlementId") REFERENCES "VendorBillingSettlement"("organizationId", "vendorId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingWorkReview" ADD CONSTRAINT "VendorBillingWorkReview_organizationId_vendorId_fkey" FOREIGN KEY ("organizationId", "vendorId") REFERENCES "Vendor"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillingEvent" ADD CONSTRAINT "VendorBillingEvent_organizationId_vendorId_fkey" FOREIGN KEY ("organizationId", "vendorId") REFERENCES "Vendor"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reserve contiguous work-ticket ranges and batch numbers safely across concurrent requests.
CREATE SEQUENCE "VendorWorkJobNumberSeq";
SELECT setval('"VendorWorkJobNumberSeq"', GREATEST(COALESCE(MAX(substring("jobNumber" from '^VJ-([0-9]+)$')::bigint), 0),1), COALESCE(MAX(substring("jobNumber" from '^VJ-([0-9]+)$')::bigint),0)>0) FROM "VendorWorkJob";
CREATE SEQUENCE "VendorBatchNumberSeq";
SELECT setval('"VendorBatchNumberSeq"', GREATEST(COALESCE(MAX(substring("batchNumber" from '^VB-([0-9]+)$')::bigint),0),1), COALESCE(MAX(substring("batchNumber" from '^VB-([0-9]+)$')::bigint),0)>0) FROM "VendorInvoiceBatch";
ALTER TABLE "VendorBillingDocument" ADD CONSTRAINT "VendorBillingDocument_values_check" CHECK ("amountCents">0 AND "taxCents">=0 AND "taxCents"<="amountCents" AND "direction" IN ('RECEIVABLE','PAYABLE') AND "status" IN ('DRAFT','POSTED','DISPUTED','VOID') AND "kind" IN ('INVOICE','OPENING_BALANCE'));
ALTER TABLE "VendorBillingAgreement" ADD CONSTRAINT "VendorBillingAgreement_values_check" CHECK ("amountCents">0 AND ("principalCents" IS NULL OR "principalCents">0) AND "direction" IN ('RECEIVABLE','PAYABLE') AND "kind" IN ('RENT','SERVICE','REPAYMENT'));
ALTER TABLE "VendorBillingLine" ADD CONSTRAINT "VendorBillingLine_amount_check" CHECK ("amountCents">0);
ALTER TABLE "VendorBillingDueItem" ADD CONSTRAINT "VendorBillingDueItem_amount_check" CHECK ("amountCents">0);
ALTER TABLE "VendorBillingSettlement" ADD CONSTRAINT "VendorBillingSettlement_values_check" CHECK ("amountCents">0 AND "kind" IN ('RECEIPT','PAYMENT','OFFSET','CREDIT','REVERSAL'));
ALTER TABLE "VendorBillingAllocation" ADD CONSTRAINT "VendorBillingAllocation_amount_check" CHECK ("amountCents"<>0);
ALTER TABLE "VendorBillingWorkReview" ADD CONSTRAINT "VendorBillingWorkReview_amount_check" CHECK ("approvedAmountCents">0);
ALTER TABLE "VendorBillingSettlement" ADD CONSTRAINT "VendorBillingSettlement_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "VendorBillingSettlement"("id") ON DELETE RESTRICT;
