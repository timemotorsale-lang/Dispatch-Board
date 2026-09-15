ALTER TYPE "VendorActivityType" ADD VALUE IF NOT EXISTS 'DOCUMENT_UPLOADED';

CREATE TABLE "VendorDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "uploadedByUserId" TEXT,
  "title" TEXT NOT NULL,
  "documentType" TEXT NOT NULL DEFAULT 'GENERAL',
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "fileData" BYTEA NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VendorDocument_organizationId_vendorId_createdAt_idx" ON "VendorDocument"("organizationId", "vendorId", "createdAt");
CREATE INDEX "VendorDocument_organizationId_documentType_createdAt_idx" ON "VendorDocument"("organizationId", "documentType", "createdAt");

ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
