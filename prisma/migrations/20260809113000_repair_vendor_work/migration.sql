CREATE TYPE "RepairVendorWorkStatus" AS ENUM ('ESTIMATE_NEEDED', 'APPROVAL_NEEDED', 'SCHEDULED', 'AT_VENDOR', 'WAITING_PARTS', 'SUPPLEMENT_NEEDED', 'READY_FOR_PICKUP', 'RETURNED', 'QC_REQUIRED', 'COMPLETED', 'CANCELLED');

CREATE TYPE "RepairVendorApprovalStatus" AS ENUM ('NEEDS_DOCUMENTATION', 'PENDING', 'APPROVED', 'DECLINED', 'NOT_REQUIRED');

CREATE TYPE "RepairVendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "RepairVendor" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "vendorType" TEXT NOT NULL,
  "contactName" TEXT,
  "phoneNumber" TEXT,
  "email" TEXT,
  "address" TEXT,
  "defaultLeadDays" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "status" "RepairVendorStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepairVendor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairVendor_defaultLeadDays_check" CHECK ("defaultLeadDays" >= 0)
);

CREATE TABLE "RepairVendorWork" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "vendorId" TEXT,
  "vendorName" TEXT NOT NULL,
  "vendorContact" TEXT,
  "externalReference" TEXT,
  "workType" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "status" "RepairVendorWorkStatus" NOT NULL,
  "approvalStatus" "RepairVendorApprovalStatus" NOT NULL,
  "estimateAmountCents" INTEGER,
  "approvedAmountCents" INTEGER,
  "supplementalAmountCents" INTEGER,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "sentFrom" TEXT NOT NULL,
  "directFromSource" BOOLEAN NOT NULL DEFAULT false,
  "expectedReturnAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "transportMethod" TEXT,
  "keysCustodian" TEXT NOT NULL,
  "currentLocation" TEXT NOT NULL,
  "lastUpdateSummary" TEXT NOT NULL,
  "nextAction" TEXT NOT NULL,
  "nextFollowUpAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepairVendorWork_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairVendorWork_nonnegative_amounts" CHECK (
    ("estimateAmountCents" IS NULL OR "estimateAmountCents" >= 0) AND
    ("approvedAmountCents" IS NULL OR "approvedAmountCents" >= 0) AND
    ("supplementalAmountCents" IS NULL OR "supplementalAmountCents" >= 0)
  )
);

CREATE TABLE "RepairVendorWorkEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorWorkId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "fromStatus" "RepairVendorWorkStatus",
  "toStatus" "RepairVendorWorkStatus" NOT NULL,
  "approvalStatus" "RepairVendorApprovalStatus" NOT NULL,
  "summary" TEXT NOT NULL,
  "customerVisibleSummary" TEXT NOT NULL,
  "internalNotes" TEXT,
  "estimateAmountCents" INTEGER,
  "approvedAmountCents" INTEGER,
  "supplementalAmountCents" INTEGER,
  "expectedReturnAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "evidence" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepairVendorWorkEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepairVendorWork_organizationId_status_expectedReturnAt_idx" ON "RepairVendorWork"("organizationId", "status", "expectedReturnAt");
CREATE INDEX "RepairVendorWork_repairOrderId_status_idx" ON "RepairVendorWork"("repairOrderId", "status");
CREATE INDEX "RepairVendorWork_vendorId_status_idx" ON "RepairVendorWork"("vendorId", "status");
CREATE UNIQUE INDEX "RepairVendor_organizationId_code_key" ON "RepairVendor"("organizationId", "code");
CREATE UNIQUE INDEX "RepairVendor_organizationId_name_key" ON "RepairVendor"("organizationId", "name");
CREATE INDEX "RepairVendor_organizationId_status_vendorType_idx" ON "RepairVendor"("organizationId", "status", "vendorType");
CREATE UNIQUE INDEX "RepairVendorWorkEvent_vendorWorkId_version_key" ON "RepairVendorWorkEvent"("vendorWorkId", "version");
CREATE INDEX "RepairVendorWorkEvent_organizationId_occurredAt_idx" ON "RepairVendorWorkEvent"("organizationId", "occurredAt");
CREATE INDEX "RepairVendorWorkEvent_vendorWorkId_occurredAt_idx" ON "RepairVendorWorkEvent"("vendorWorkId", "occurredAt");

ALTER TABLE "RepairVendorWork" ADD CONSTRAINT "RepairVendorWork_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairVendorWork" ADD CONSTRAINT "RepairVendorWork_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairVendorWork" ADD CONSTRAINT "RepairVendorWork_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "RepairVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairVendorWork" ADD CONSTRAINT "RepairVendorWork_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairVendorWorkEvent" ADD CONSTRAINT "RepairVendorWorkEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairVendorWorkEvent" ADD CONSTRAINT "RepairVendorWorkEvent_vendorWorkId_fkey" FOREIGN KEY ("vendorWorkId") REFERENCES "RepairVendorWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairVendorWorkEvent" ADD CONSTRAINT "RepairVendorWorkEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairVendor" ADD CONSTRAINT "RepairVendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairVendor" ADD CONSTRAINT "RepairVendor_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
