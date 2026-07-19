CREATE TYPE "InventoryConsoleSavedViewVisibility" AS ENUM ('PERSONAL', 'TEAM');

CREATE TABLE "InventoryConsoleSavedView" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visibility" "InventoryConsoleSavedViewVisibility" NOT NULL DEFAULT 'PERSONAL',
    "config" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryConsoleSavedView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryConsoleSavedView_organizationId_createdByUserId_name_key"
ON "InventoryConsoleSavedView"("organizationId", "createdByUserId", "name");
CREATE INDEX "InventoryConsoleSavedView_organizationId_visibility_updatedAt_idx"
ON "InventoryConsoleSavedView"("organizationId", "visibility", "updatedAt");
CREATE INDEX "InventoryConsoleSavedView_createdByUserId_updatedAt_idx"
ON "InventoryConsoleSavedView"("createdByUserId", "updatedAt");

ALTER TABLE "InventoryConsoleSavedView"
ADD CONSTRAINT "InventoryConsoleSavedView_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryConsoleSavedView"
ADD CONSTRAINT "InventoryConsoleSavedView_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryConsoleSavedView"
ADD CONSTRAINT "InventoryConsoleSavedView_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 80);
ALTER TABLE "InventoryConsoleSavedView"
ADD CONSTRAINT "InventoryConsoleSavedView_version_check" CHECK ("version" >= 1);
