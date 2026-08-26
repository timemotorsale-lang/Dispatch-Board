CREATE TYPE "UnifiedCrmSavedViewVisibility" AS ENUM ('PERSONAL', 'TEAM');

CREATE TABLE "UnifiedCrmSavedView" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "visibility" "UnifiedCrmSavedViewVisibility" NOT NULL DEFAULT 'PERSONAL',
  "config" JSONB NOT NULL,
  "configSchemaVersion" INTEGER NOT NULL DEFAULT 1,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnifiedCrmSavedView_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UnifiedCrmSavedView_config_schema_version_check" CHECK ("configSchemaVersion" >= 1),
  CONSTRAINT "UnifiedCrmSavedView_version_check" CHECK ("version" >= 1)
);

CREATE UNIQUE INDEX "UnifiedCrmSavedView_organizationId_createdByUserId_name_key"
  ON "UnifiedCrmSavedView"("organizationId", "createdByUserId", "name");

CREATE INDEX "UnifiedCrmSavedView_organizationId_visibility_updatedAt_idx"
  ON "UnifiedCrmSavedView"("organizationId", "visibility", "updatedAt");

CREATE INDEX "UnifiedCrmSavedView_createdByUserId_updatedAt_idx"
  ON "UnifiedCrmSavedView"("createdByUserId", "updatedAt");

ALTER TABLE "UnifiedCrmSavedView"
  ADD CONSTRAINT "UnifiedCrmSavedView_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmSavedView"
  ADD CONSTRAINT "UnifiedCrmSavedView_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
