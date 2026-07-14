-- CreateEnum
CREATE TYPE "InvoiceHandoffStatus" AS ENUM ('READY', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RepairOrderClosureType" AS ENUM ('CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "PartVendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "PartInterchangeType" AS ENUM ('SUBSTITUTE', 'SUPERSESSION');

-- CreateEnum
CREATE TYPE "PartRequisitionStatus" AS ENUM ('SOURCING', 'SELECTED', 'ORDERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartPurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartDiscrepancyType" AS ENUM ('SHORT', 'OVER', 'DAMAGED', 'WRONG_PART', 'COST_VARIANCE');

-- CreateEnum
CREATE TYPE "PartDiscrepancyStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PartCustodyType" AS ENUM ('ISSUE', 'INSTALL', 'UNUSED_RETURN', 'TRANSFER_SHIP', 'TRANSFER_RECEIVE', 'CORE_SHIP', 'WARRANTY_SHIP', 'VENDOR_SHIP', 'CREDIT_ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "PartTransferStatus" AS ENUM ('DRAFT', 'SHIPPED', 'RECEIVED', 'DISCREPANCY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartRecoveryType" AS ENUM ('CORE', 'WARRANTY', 'VENDOR_RETURN');

-- CreateEnum
CREATE TYPE "PartRecoveryStatus" AS ENUM ('ELIGIBLE', 'SHIPPED', 'ACKNOWLEDGED', 'CREDITED', 'DISPUTED', 'WRITTEN_OFF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PartLedgerMovementType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "PartLedgerMovementType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "PartLedgerMovementType" ADD VALUE 'CORE_RETURN';
ALTER TYPE "PartLedgerMovementType" ADD VALUE 'WARRANTY_RETURN';
ALTER TYPE "PartLedgerMovementType" ADD VALUE 'VENDOR_RETURN';

-- CreateTable
CREATE TABLE "ServiceInvoicePackage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "InvoiceHandoffStatus" NOT NULL DEFAULT 'READY',
    "lineItems" JSONB NOT NULL,
    "authorizedTotalCents" INTEGER NOT NULL,
    "installedPartsCostCents" INTEGER NOT NULL,
    "clockedLaborMinutes" INTEGER NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "mismatchCodes" JSONB NOT NULL,
    "externalSystemCode" TEXT,
    "externalReference" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceInvoicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairOrderClosureEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "type" "RepairOrderClosureType" NOT NULL,
    "invoicePackageId" TEXT,
    "finalOdometer" INTEGER,
    "keysVerified" BOOLEAN NOT NULL,
    "recipientName" TEXT,
    "handoffEvidence" JSONB NOT NULL,
    "priorStage" "RepairOrderStage" NOT NULL,
    "resultingStage" "RepairOrderStage" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairOrderClosureEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartVendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PartVendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "paymentTerms" TEXT NOT NULL,
    "defaultWarranty" TEXT NOT NULL,
    "defaultReturnTerms" TEXT NOT NULL,
    "reliabilityBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartInterchange" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "primaryPartId" TEXT NOT NULL,
    "alternatePartId" TEXT NOT NULL,
    "type" "PartInterchangeType" NOT NULL,
    "fitmentEvidence" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartInterchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartVendorOffer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "vendorPartNumber" TEXT NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "estimatedArrivalAt" TIMESTAMP(3),
    "warrantyTerms" TEXT NOT NULL,
    "returnTerms" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartVendorOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartRequisition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "status" "PartRequisitionStatus" NOT NULL DEFAULT 'SOURCING',
    "requiredAt" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selectedOfferId" TEXT,
    "comparisonSnapshot" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartPurchaseOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "requisitionId" TEXT,
    "purchaseOrderNumber" TEXT NOT NULL,
    "status" "PartPurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "lines" JSONB NOT NULL,
    "orderedTotalCents" INTEGER NOT NULL,
    "receivedTotalCents" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "stockLocationId" TEXT NOT NULL,
    "packingSource" TEXT NOT NULL,
    "invoiceReference" TEXT,
    "lines" JSONB NOT NULL,
    "receivedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartReceivingDiscrepancy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "type" "PartDiscrepancyType" NOT NULL,
    "status" "PartDiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "partId" TEXT,
    "expectedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "expectedCostCents" INTEGER NOT NULL,
    "receivedCostCents" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "resolvedByUserId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartReceivingDiscrepancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartCustodyEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "PartCustodyType" NOT NULL,
    "partId" TEXT NOT NULL,
    "repairJobId" TEXT,
    "fromStockLocationId" TEXT,
    "toStockLocationId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartCustodyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartTransfer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "status" "PartTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "fromStockLocationId" TEXT NOT NULL,
    "toStockLocationId" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "discrepancyNotes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartRecoveryCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "vendorId" TEXT,
    "type" "PartRecoveryType" NOT NULL,
    "status" "PartRecoveryStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "sourceReference" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "expectedCreditCents" INTEGER NOT NULL,
    "actualCreditCents" INTEGER,
    "disputeReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "shippedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartRecoveryCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceInvoicePackage_organizationId_status_generatedAt_idx" ON "ServiceInvoicePackage"("organizationId", "status", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInvoicePackage_repairOrderId_version_key" ON "ServiceInvoicePackage"("repairOrderId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInvoicePackage_organizationId_externalSystemCode_ext_key" ON "ServiceInvoicePackage"("organizationId", "externalSystemCode", "externalReference");

-- CreateIndex
CREATE INDEX "RepairOrderClosureEvent_organizationId_type_occurredAt_idx" ON "RepairOrderClosureEvent"("organizationId", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepairOrderClosureEvent_repairOrderId_version_key" ON "RepairOrderClosureEvent"("repairOrderId", "version");

-- CreateIndex
CREATE INDEX "PartVendor_organizationId_status_name_idx" ON "PartVendor"("organizationId", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PartVendor_organizationId_code_key" ON "PartVendor"("organizationId", "code");

-- CreateIndex
CREATE INDEX "PartInterchange_alternatePartId_approved_idx" ON "PartInterchange"("alternatePartId", "approved");

-- CreateIndex
CREATE UNIQUE INDEX "PartInterchange_organizationId_primaryPartId_alternatePartI_key" ON "PartInterchange"("organizationId", "primaryPartId", "alternatePartId", "type");

-- CreateIndex
CREATE INDEX "PartVendorOffer_organizationId_partId_effectiveTo_idx" ON "PartVendorOffer"("organizationId", "partId", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "PartVendorOffer_vendorId_partId_vendorPartNumber_effectiveF_key" ON "PartVendorOffer"("vendorId", "partId", "vendorPartNumber", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PartRequisition_organizationId_status_requiredAt_idx" ON "PartRequisition"("organizationId", "status", "requiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartRequisition_demandId_status_key" ON "PartRequisition"("demandId", "status");

-- CreateIndex
CREATE INDEX "PartPurchaseOrder_organizationId_status_createdAt_idx" ON "PartPurchaseOrder"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartPurchaseOrder_organizationId_purchaseOrderNumber_key" ON "PartPurchaseOrder"("organizationId", "purchaseOrderNumber");

-- CreateIndex
CREATE INDEX "PartReceipt_organizationId_receivedAt_idx" ON "PartReceipt"("organizationId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartReceipt_purchaseOrderId_packingSource_key" ON "PartReceipt"("purchaseOrderId", "packingSource");

-- CreateIndex
CREATE INDEX "PartReceivingDiscrepancy_organizationId_status_createdAt_idx" ON "PartReceivingDiscrepancy"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PartCustodyEvent_repairJobId_occurredAt_idx" ON "PartCustodyEvent"("repairJobId", "occurredAt");

-- CreateIndex
CREATE INDEX "PartCustodyEvent_partId_occurredAt_idx" ON "PartCustodyEvent"("partId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartCustodyEvent_organizationId_sourceType_sourceId_type_key" ON "PartCustodyEvent"("organizationId", "sourceType", "sourceId", "type");

-- CreateIndex
CREATE INDEX "PartTransfer_organizationId_status_createdAt_idx" ON "PartTransfer"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartTransfer_organizationId_transferNumber_key" ON "PartTransfer"("organizationId", "transferNumber");

-- CreateIndex
CREATE INDEX "PartRecoveryCase_organizationId_status_deadlineAt_idx" ON "PartRecoveryCase"("organizationId", "status", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartRecoveryCase_organizationId_type_sourceReference_key" ON "PartRecoveryCase"("organizationId", "type", "sourceReference");

-- AddForeignKey
ALTER TABLE "ServiceInvoicePackage" ADD CONSTRAINT "ServiceInvoicePackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoicePackage" ADD CONSTRAINT "ServiceInvoicePackage_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoicePackage" ADD CONSTRAINT "ServiceInvoicePackage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrderClosureEvent" ADD CONSTRAINT "RepairOrderClosureEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrderClosureEvent" ADD CONSTRAINT "RepairOrderClosureEvent_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrderClosureEvent" ADD CONSTRAINT "RepairOrderClosureEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartVendor" ADD CONSTRAINT "PartVendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartVendor" ADD CONSTRAINT "PartVendor_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInterchange" ADD CONSTRAINT "PartInterchange_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInterchange" ADD CONSTRAINT "PartInterchange_primaryPartId_fkey" FOREIGN KEY ("primaryPartId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInterchange" ADD CONSTRAINT "PartInterchange_alternatePartId_fkey" FOREIGN KEY ("alternatePartId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInterchange" ADD CONSTRAINT "PartInterchange_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartVendorOffer" ADD CONSTRAINT "PartVendorOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartVendorOffer" ADD CONSTRAINT "PartVendorOffer_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "PartVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartVendorOffer" ADD CONSTRAINT "PartVendorOffer_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequisition" ADD CONSTRAINT "PartRequisition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequisition" ADD CONSTRAINT "PartRequisition_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "RepairPartDemand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequisition" ADD CONSTRAINT "PartRequisition_selectedOfferId_fkey" FOREIGN KEY ("selectedOfferId") REFERENCES "PartVendorOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequisition" ADD CONSTRAINT "PartRequisition_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPurchaseOrder" ADD CONSTRAINT "PartPurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPurchaseOrder" ADD CONSTRAINT "PartPurchaseOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPurchaseOrder" ADD CONSTRAINT "PartPurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "PartVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPurchaseOrder" ADD CONSTRAINT "PartPurchaseOrder_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PartRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPurchaseOrder" ADD CONSTRAINT "PartPurchaseOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartReceipt" ADD CONSTRAINT "PartReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartReceipt" ADD CONSTRAINT "PartReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PartPurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartReceipt" ADD CONSTRAINT "PartReceipt_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartReceipt" ADD CONSTRAINT "PartReceipt_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartReceivingDiscrepancy" ADD CONSTRAINT "PartReceivingDiscrepancy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartReceivingDiscrepancy" ADD CONSTRAINT "PartReceivingDiscrepancy_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PartReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartReceivingDiscrepancy" ADD CONSTRAINT "PartReceivingDiscrepancy_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartReceivingDiscrepancy" ADD CONSTRAINT "PartReceivingDiscrepancy_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCustodyEvent" ADD CONSTRAINT "PartCustodyEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCustodyEvent" ADD CONSTRAINT "PartCustodyEvent_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCustodyEvent" ADD CONSTRAINT "PartCustodyEvent_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCustodyEvent" ADD CONSTRAINT "PartCustodyEvent_fromStockLocationId_fkey" FOREIGN KEY ("fromStockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCustodyEvent" ADD CONSTRAINT "PartCustodyEvent_toStockLocationId_fkey" FOREIGN KEY ("toStockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCustodyEvent" ADD CONSTRAINT "PartCustodyEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransfer" ADD CONSTRAINT "PartTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransfer" ADD CONSTRAINT "PartTransfer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransfer" ADD CONSTRAINT "PartTransfer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransfer" ADD CONSTRAINT "PartTransfer_fromStockLocationId_fkey" FOREIGN KEY ("fromStockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartTransfer" ADD CONSTRAINT "PartTransfer_toStockLocationId_fkey" FOREIGN KEY ("toStockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRecoveryCase" ADD CONSTRAINT "PartRecoveryCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRecoveryCase" ADD CONSTRAINT "PartRecoveryCase_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRecoveryCase" ADD CONSTRAINT "PartRecoveryCase_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "PartVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRecoveryCase" ADD CONSTRAINT "PartRecoveryCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrderClosureEvent" ADD CONSTRAINT "RepairOrderClosureEvent_invoicePackageId_fkey" FOREIGN KEY ("invoicePackageId") REFERENCES "ServiceInvoicePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enterprise invariants and immutable evidence
ALTER TABLE "ServiceInvoicePackage"
  ADD CONSTRAINT "ServiceInvoicePackage_amounts_check" CHECK ("version" > 0 AND "authorizedTotalCents" >= 0 AND "installedPartsCostCents" >= 0 AND "clockedLaborMinutes" >= 0),
  ADD CONSTRAINT "ServiceInvoicePackage_json_check" CHECK (jsonb_typeof("lineItems") = 'array' AND jsonb_typeof("sourceSnapshot") = 'object' AND jsonb_typeof("mismatchCodes") = 'array'),
  ADD CONSTRAINT "ServiceInvoicePackage_handoff_check" CHECK (("status" = 'READY' AND "submittedAt" IS NULL) OR ("status" <> 'READY'));

ALTER TABLE "RepairOrderClosureEvent"
  ADD CONSTRAINT "RepairOrderClosureEvent_version_odometer_check" CHECK ("version" > 0 AND ("finalOdometer" IS NULL OR "finalOdometer" >= 0)),
  ADD CONSTRAINT "RepairOrderClosureEvent_evidence_check" CHECK (jsonb_typeof("handoffEvidence") = 'array'),
  ADD CONSTRAINT "RepairOrderClosureEvent_close_evidence_check" CHECK ("type" <> 'CLOSED' OR ("invoicePackageId" IS NOT NULL AND "keysVerified" = TRUE AND "recipientName" IS NOT NULL AND length(btrim("recipientName")) > 0 AND jsonb_array_length("handoffEvidence") > 0));

ALTER TABLE "PartVendor" ADD CONSTRAINT "PartVendor_reliability_check" CHECK ("reliabilityBasisPoints" BETWEEN 0 AND 10000);
ALTER TABLE "PartInterchange"
  ADD CONSTRAINT "PartInterchange_distinct_parts_check" CHECK ("primaryPartId" <> "alternatePartId"),
  ADD CONSTRAINT "PartInterchange_fitment_check" CHECK (jsonb_typeof("fitmentEvidence") = 'array' AND jsonb_array_length("fitmentEvidence") > 0),
  ADD CONSTRAINT "PartInterchange_approval_check" CHECK (("approved" = FALSE AND "approvedByUserId" IS NULL AND "approvedAt" IS NULL) OR ("approved" = TRUE AND "approvedByUserId" IS NOT NULL AND "approvedAt" IS NOT NULL));
ALTER TABLE "PartVendorOffer"
  ADD CONSTRAINT "PartVendorOffer_values_check" CHECK ("unitCostCents" >= 0 AND "availableQuantity" >= 0),
  ADD CONSTRAINT "PartVendorOffer_effective_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");
ALTER TABLE "PartRequisition"
  ADD CONSTRAINT "PartRequisition_values_check" CHECK ("quantity" > 0 AND "version" > 0),
  ADD CONSTRAINT "PartRequisition_selection_check" CHECK (("status" = 'SOURCING' AND "selectedOfferId" IS NULL) OR ("status" <> 'SOURCING')),
  ADD CONSTRAINT "PartRequisition_comparison_check" CHECK (jsonb_typeof("comparisonSnapshot") = 'array');
ALTER TABLE "PartPurchaseOrder"
  ADD CONSTRAINT "PartPurchaseOrder_values_check" CHECK ("orderedTotalCents" >= 0 AND "receivedTotalCents" >= 0 AND "version" > 0),
  ADD CONSTRAINT "PartPurchaseOrder_lines_check" CHECK (jsonb_typeof("lines") = 'array' AND jsonb_array_length("lines") > 0);
ALTER TABLE "PartReceipt" ADD CONSTRAINT "PartReceipt_lines_check" CHECK (jsonb_typeof("lines") = 'array' AND jsonb_array_length("lines") > 0);
ALTER TABLE "PartReceivingDiscrepancy"
  ADD CONSTRAINT "PartReceivingDiscrepancy_values_check" CHECK ("expectedQuantity" >= 0 AND "receivedQuantity" >= 0 AND "expectedCostCents" >= 0 AND "receivedCostCents" >= 0 AND "version" > 0),
  ADD CONSTRAINT "PartReceivingDiscrepancy_resolution_check" CHECK (("status" = 'OPEN' AND "resolvedByUserId" IS NULL AND "resolvedAt" IS NULL AND "resolution" IS NULL) OR ("status" = 'RESOLVED' AND "resolvedByUserId" IS NOT NULL AND "resolvedAt" IS NOT NULL AND "resolution" IS NOT NULL));
ALTER TABLE "PartCustodyEvent"
  ADD CONSTRAINT "PartCustodyEvent_values_check" CHECK ("quantity" > 0 AND "unitCostCents" >= 0),
  ADD CONSTRAINT "PartCustodyEvent_evidence_check" CHECK (jsonb_typeof("evidence") = 'array'),
  ADD CONSTRAINT "PartCustodyEvent_location_check" CHECK (("type" IN ('ISSUE','TRANSFER_SHIP','CORE_SHIP','WARRANTY_SHIP','VENDOR_SHIP') AND "fromStockLocationId" IS NOT NULL) OR ("type" IN ('UNUSED_RETURN','TRANSFER_RECEIVE') AND "toStockLocationId" IS NOT NULL) OR ("type" IN ('INSTALL','CREDIT_ACKNOWLEDGED')));
ALTER TABLE "PartTransfer"
  ADD CONSTRAINT "PartTransfer_distinct_locations_check" CHECK ("fromStockLocationId" <> "toStockLocationId"),
  ADD CONSTRAINT "PartTransfer_lines_check" CHECK (jsonb_typeof("lines") = 'array' AND jsonb_array_length("lines") > 0 AND "version" > 0);
ALTER TABLE "PartRecoveryCase"
  ADD CONSTRAINT "PartRecoveryCase_values_check" CHECK ("quantity" > 0 AND "expectedCreditCents" >= 0 AND ("actualCreditCents" IS NULL OR "actualCreditCents" >= 0) AND "version" > 0),
  ADD CONSTRAINT "PartRecoveryCase_credit_check" CHECK ("status" <> 'CREDITED' OR ("actualCreditCents" IS NOT NULL AND "resolvedAt" IS NOT NULL)),
  ADD CONSTRAINT "PartRecoveryCase_dispute_check" CHECK ("status" <> 'DISPUTED' OR ("disputeReason" IS NOT NULL AND length(btrim("disputeReason")) > 0));

CREATE FUNCTION prevent_service_parts_evidence_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION '% is immutable', TG_TABLE_NAME; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "RepairOrderClosureEvent_prevent_mutation" BEFORE UPDATE OR DELETE ON "RepairOrderClosureEvent" FOR EACH ROW EXECUTE FUNCTION prevent_service_parts_evidence_mutation();
CREATE TRIGGER "PartVendorOffer_prevent_mutation" BEFORE UPDATE OR DELETE ON "PartVendorOffer" FOR EACH ROW EXECUTE FUNCTION prevent_service_parts_evidence_mutation();
CREATE TRIGGER "PartInterchange_prevent_mutation" BEFORE UPDATE OR DELETE ON "PartInterchange" FOR EACH ROW EXECUTE FUNCTION prevent_service_parts_evidence_mutation();
CREATE TRIGGER "PartReceipt_prevent_mutation" BEFORE UPDATE OR DELETE ON "PartReceipt" FOR EACH ROW EXECUTE FUNCTION prevent_service_parts_evidence_mutation();
CREATE TRIGGER "PartCustodyEvent_prevent_mutation" BEFORE UPDATE OR DELETE ON "PartCustodyEvent" FOR EACH ROW EXECUTE FUNCTION prevent_service_parts_evidence_mutation();
