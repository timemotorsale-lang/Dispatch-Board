-- Repair the Wave 5 schema drift: the Prisma model has always included this
-- governed package status, but the original table migration omitted it.
ALTER TABLE "InventoryMerchandisingPackage"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "InventoryMerchandisingPackage"
  ALTER COLUMN "photoReferences" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "listingChannels" SET DEFAULT '[]'::jsonb;

DROP INDEX IF EXISTS "InventoryMerchandisingPackage_organizationId_frontlineReady_idx";

CREATE INDEX IF NOT EXISTS "InventoryMerchandisingPackage_organizationId_status_idx"
  ON "InventoryMerchandisingPackage"("organizationId", "status");
