-- Add enterprise appointment catalog versioning and audit events.

CREATE TYPE "AppointmentCatalogVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

CREATE TYPE "AppointmentCatalogChangeAction" AS ENUM ('SEEDED', 'DRAFT_CREATED', 'DRAFT_UPDATED', 'ACTIVATED', 'RETIRED');

CREATE TABLE "AppointmentCatalogVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AppointmentCatalogVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reason" TEXT NOT NULL,
    "catalogSnapshot" JSONB NOT NULL,
    "validationSnapshot" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentCatalogVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentCatalogChangeEvent" (
    "id" TEXT NOT NULL,
    "catalogVersionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AppointmentCatalogChangeAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "priorSnapshot" JSONB,
    "newSnapshot" JSONB NOT NULL,
    "validationSnapshot" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentCatalogChangeEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentCatalogVersion_organizationId_version_key" ON "AppointmentCatalogVersion"("organizationId", "version");
CREATE INDEX "AppointmentCatalogVersion_organizationId_status_idx" ON "AppointmentCatalogVersion"("organizationId", "status");
CREATE INDEX "AppointmentCatalogVersion_createdByUserId_idx" ON "AppointmentCatalogVersion"("createdByUserId");
CREATE INDEX "AppointmentCatalogVersion_activatedByUserId_idx" ON "AppointmentCatalogVersion"("activatedByUserId");
CREATE INDEX "AppointmentCatalogChangeEvent_catalogVersionId_occurredAt_idx" ON "AppointmentCatalogChangeEvent"("catalogVersionId", "occurredAt");
CREATE INDEX "AppointmentCatalogChangeEvent_organizationId_action_occurredAt_idx" ON "AppointmentCatalogChangeEvent"("organizationId", "action", "occurredAt");
CREATE INDEX "AppointmentCatalogChangeEvent_actorUserId_occurredAt_idx" ON "AppointmentCatalogChangeEvent"("actorUserId", "occurredAt");

ALTER TABLE "AppointmentCatalogVersion" ADD CONSTRAINT "AppointmentCatalogVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentCatalogVersion" ADD CONSTRAINT "AppointmentCatalogVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentCatalogVersion" ADD CONSTRAINT "AppointmentCatalogVersion_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentCatalogChangeEvent" ADD CONSTRAINT "AppointmentCatalogChangeEvent_catalogVersionId_fkey" FOREIGN KEY ("catalogVersionId") REFERENCES "AppointmentCatalogVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentCatalogChangeEvent" ADD CONSTRAINT "AppointmentCatalogChangeEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentCatalogChangeEvent" ADD CONSTRAINT "AppointmentCatalogChangeEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
