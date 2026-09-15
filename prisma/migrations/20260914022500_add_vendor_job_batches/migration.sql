ALTER TYPE "VendorActivityType" ADD VALUE IF NOT EXISTS 'JOB_RECORDED';
ALTER TYPE "VendorActivityType" ADD VALUE IF NOT EXISTS 'BATCH_OPENED';
ALTER TYPE "VendorActivityType" ADD VALUE IF NOT EXISTS 'BATCH_CLOSED';

CREATE TYPE "VendorWorkJobStatus" AS ENUM (
  'OPEN',
  'READY_FOR_BATCH',
  'BATCHED',
  'INVOICED',
  'CANCELLED'
);

CREATE TYPE "VendorInvoiceBatchStatus" AS ENUM (
  'OPEN',
  'CLOSED',
  'INVOICED',
  'PAID',
  'VOID'
);

CREATE TABLE "VendorInvoiceBatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "VendorInvoiceBatchStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "invoiceNumber" TEXT,
  "invoiceDate" DATE,
  "totalAmount" DECIMAL(12,2),
  "notes" TEXT,
  "createdByUserId" TEXT,
  "closedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorInvoiceBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorWorkJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "batchId" TEXT,
  "jobNumber" TEXT NOT NULL,
  "vehicleReference" TEXT NOT NULL,
  "workType" TEXT NOT NULL,
  "workDescription" TEXT,
  "serviceDate" DATE NOT NULL,
  "amount" DECIMAL(12,2),
  "status" "VendorWorkJobStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorWorkJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorInvoiceBatch_organizationId_batchNumber_key" ON "VendorInvoiceBatch"("organizationId", "batchNumber");
CREATE INDEX "VendorInvoiceBatch_organizationId_vendorId_status_openedAt_idx" ON "VendorInvoiceBatch"("organizationId", "vendorId", "status", "openedAt");
CREATE UNIQUE INDEX "VendorWorkJob_organizationId_jobNumber_key" ON "VendorWorkJob"("organizationId", "jobNumber");
CREATE INDEX "VendorWorkJob_organizationId_vendorId_status_serviceDate_idx" ON "VendorWorkJob"("organizationId", "vendorId", "status", "serviceDate");
CREATE INDEX "VendorWorkJob_organizationId_batchId_idx" ON "VendorWorkJob"("organizationId", "batchId");

ALTER TABLE "VendorInvoiceBatch" ADD CONSTRAINT "VendorInvoiceBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorInvoiceBatch" ADD CONSTRAINT "VendorInvoiceBatch_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorInvoiceBatch" ADD CONSTRAINT "VendorInvoiceBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorInvoiceBatch" ADD CONSTRAINT "VendorInvoiceBatch_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorWorkJob" ADD CONSTRAINT "VendorWorkJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorWorkJob" ADD CONSTRAINT "VendorWorkJob_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorWorkJob" ADD CONSTRAINT "VendorWorkJob_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "VendorInvoiceBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorWorkJob" ADD CONSTRAINT "VendorWorkJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
