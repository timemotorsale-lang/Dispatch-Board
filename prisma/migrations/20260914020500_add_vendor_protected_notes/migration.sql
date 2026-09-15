ALTER TYPE "VendorActivityType" ADD VALUE IF NOT EXISTS 'PROTECTED_NOTE_ADDED';

CREATE TABLE "VendorProtectedNote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VendorProtectedNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VendorProtectedNote_organizationId_vendorId_createdAt_idx" ON "VendorProtectedNote"("organizationId", "vendorId", "createdAt");
CREATE INDEX "VendorProtectedNote_organizationId_authorUserId_idx" ON "VendorProtectedNote"("organizationId", "authorUserId");

ALTER TABLE "VendorProtectedNote" ADD CONSTRAINT "VendorProtectedNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorProtectedNote" ADD CONSTRAINT "VendorProtectedNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorProtectedNote" ADD CONSTRAINT "VendorProtectedNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
