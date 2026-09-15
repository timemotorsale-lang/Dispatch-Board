CREATE TYPE "VendorCategory" AS ENUM (
  'LENDER_BANK',
  'WARRANTY_COMPANY',
  'TRANSPORT_PROVIDER',
  'PARTS_SUPPLIER',
  'RECON_REPAIR_VENDOR',
  'AUCTION_WHOLESALE_PARTNER',
  'INTERNAL_CONTACT',
  'OTHER'
);

CREATE TYPE "VendorStatus" AS ENUM (
  'PREFERRED',
  'ACTIVE',
  'PENDING_REVIEW',
  'INACTIVE',
  'DO_NOT_USE'
);

CREATE TYPE "VendorActivityType" AS ENUM (
  'VENDOR_CREATED',
  'VENDOR_UPDATED',
  'STATUS_CHANGED',
  'NOTE_ADDED',
  'TASK_CREATED',
  'RECORD_LINKED'
);

CREATE TYPE "VendorRecordType" AS ENUM (
  'VEHICLE',
  'TASK',
  'APPOINTMENT',
  'REPAIR_ORDER',
  'DEAL',
  'DOCUMENT',
  'CASE',
  'OTHER'
);

CREATE TABLE "Vendor" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "category" "VendorCategory" NOT NULL,
  "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
  "primaryContactName" TEXT,
  "primaryPhone" TEXT,
  "primaryEmail" TEXT,
  "addressSummary" TEXT,
  "websiteOrPortalUrl" TEXT,
  "accountReference" TEXT,
  "ownerUserId" TEXT,
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "archivedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorNote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "body" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VendorNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorActivity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" "VendorActivityType" NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VendorActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorRecordLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "recordType" "VendorRecordType" NOT NULL,
  "recordId" TEXT NOT NULL,
  "labelSnapshot" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL DEFAULT 'RELATED',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VendorRecordLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Vendor_organizationId_vendorNumber_key" ON "Vendor"("organizationId", "vendorNumber");
CREATE INDEX "Vendor_organizationId_normalizedName_idx" ON "Vendor"("organizationId", "normalizedName");
CREATE INDEX "Vendor_organizationId_category_idx" ON "Vendor"("organizationId", "category");
CREATE INDEX "Vendor_organizationId_status_idx" ON "Vendor"("organizationId", "status");
CREATE INDEX "Vendor_organizationId_ownerUserId_idx" ON "Vendor"("organizationId", "ownerUserId");
CREATE INDEX "Vendor_organizationId_updatedAt_idx" ON "Vendor"("organizationId", "updatedAt");

CREATE INDEX "VendorNote_organizationId_vendorId_createdAt_idx" ON "VendorNote"("organizationId", "vendorId", "createdAt");
CREATE INDEX "VendorNote_organizationId_authorUserId_idx" ON "VendorNote"("organizationId", "authorUserId");

CREATE INDEX "VendorActivity_organizationId_vendorId_createdAt_idx" ON "VendorActivity"("organizationId", "vendorId", "createdAt");
CREATE INDEX "VendorActivity_organizationId_type_createdAt_idx" ON "VendorActivity"("organizationId", "type", "createdAt");

CREATE UNIQUE INDEX "VendorRecordLink_organizationId_vendorId_recordType_recordId_key" ON "VendorRecordLink"("organizationId", "vendorId", "recordType", "recordId");
CREATE INDEX "VendorRecordLink_organizationId_recordType_recordId_idx" ON "VendorRecordLink"("organizationId", "recordType", "recordId");
CREATE INDEX "VendorRecordLink_organizationId_vendorId_createdAt_idx" ON "VendorRecordLink"("organizationId", "vendorId", "createdAt");

ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorNote" ADD CONSTRAINT "VendorNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorNote" ADD CONSTRAINT "VendorNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorNote" ADD CONSTRAINT "VendorNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorActivity" ADD CONSTRAINT "VendorActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorActivity" ADD CONSTRAINT "VendorActivity_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorActivity" ADD CONSTRAINT "VendorActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorRecordLink" ADD CONSTRAINT "VendorRecordLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorRecordLink" ADD CONSTRAINT "VendorRecordLink_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorRecordLink" ADD CONSTRAINT "VendorRecordLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
