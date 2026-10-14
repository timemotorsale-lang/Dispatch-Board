-- Wave 2 / VEH-090 through VEH-093: governed evidence storage and Vehicle 360.

CREATE TYPE "VehicleEvidenceStatus" AS ENUM ('AVAILABLE', 'QUARANTINED', 'DELETED');
CREATE TYPE "VehicleEvidenceMalwareStatus" AS ENUM ('CLEAN', 'DETECTED', 'ERROR');
CREATE TYPE "VehicleEvidenceAccessLevel" AS ENUM ('INTERNAL', 'RESTRICTED');
CREATE TYPE "VehicleEvidenceCategory" AS ENUM ('PHOTO', 'INSPECTION', 'REPAIR', 'TITLE', 'WARRANTY', 'CUSTOMER_APPROVAL', 'DELIVERY', 'OTHER');
CREATE TYPE "VehicleEvidenceEventType" AS ENUM ('UPLOADED', 'ACCESSED', 'LINKED', 'QUARANTINED', 'RETENTION_CHANGED', 'DELETED');

CREATE TABLE "VehicleEvidenceObject" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "storageProvider" TEXT NOT NULL DEFAULT 'DATABASE',
  "storageKey" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "malwareStatus" "VehicleEvidenceMalwareStatus" NOT NULL,
  "malwareScanner" TEXT NOT NULL,
  "malwareScannedAt" TIMESTAMP(3) NOT NULL,
  "accessLevel" "VehicleEvidenceAccessLevel" NOT NULL DEFAULT 'INTERNAL',
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  "legalHold" BOOLEAN NOT NULL DEFAULT false,
  "status" "VehicleEvidenceStatus" NOT NULL DEFAULT 'AVAILABLE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleEvidenceObject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleEvidenceObject_file_name_check" CHECK (length(btrim("fileName")) BETWEEN 1 AND 240 AND "fileName" !~ '[\\/]'),
  CONSTRAINT "VehicleEvidenceObject_content_type_check" CHECK ("contentType" IN ('application/pdf','image/jpeg','image/png','image/webp','text/plain')),
  CONSTRAINT "VehicleEvidenceObject_byte_size_check" CHECK ("byteSize" BETWEEN 1 AND 10485760),
  CONSTRAINT "VehicleEvidenceObject_checksum_check" CHECK ("checksumSha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "VehicleEvidenceObject_storage_check" CHECK ("storageProvider" = 'DATABASE' AND length(btrim("storageKey")) > 0),
  CONSTRAINT "VehicleEvidenceObject_content_length_check" CHECK (("status" = 'DELETED' AND octet_length("content") = 0) OR ("status" <> 'DELETED' AND octet_length("content") = "byteSize")),
  CONSTRAINT "VehicleEvidenceObject_scan_check" CHECK (("status" = 'AVAILABLE' AND "malwareStatus" = 'CLEAN') OR ("status" = 'QUARANTINED' AND "malwareStatus" IN ('DETECTED','ERROR')) OR "status" = 'DELETED'),
  CONSTRAINT "VehicleEvidenceObject_delete_check" CHECK (("status" = 'DELETED') = ("deletedAt" IS NOT NULL)),
  CONSTRAINT "VehicleEvidenceObject_retention_check" CHECK ("retentionUntil" > "createdAt"),
  CONSTRAINT "VehicleEvidenceObject_version_check" CHECK ("version" > 0)
);

CREATE TABLE "VehicleEvidenceLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "evidenceObjectId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "category" "VehicleEvidenceCategory" NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleEvidenceLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleEvidenceLink_subject_check" CHECK (length(btrim("subjectType")) > 0 AND length(btrim("subjectId")) > 0 AND length(btrim("relationship")) > 0)
);

CREATE TABLE "VehicleEvidenceEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "evidenceObjectId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "eventType" "VehicleEvidenceEventType" NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleEvidenceEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleEvidenceEvent_reason_check" CHECK (length(btrim("reason")) >= 10),
  CONSTRAINT "VehicleEvidenceEvent_metadata_check" CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE UNIQUE INDEX "VehicleEvidenceObject_organizationId_storageKey_key" ON "VehicleEvidenceObject"("organizationId", "storageKey");
CREATE UNIQUE INDEX "VehicleEvidenceObject_id_organizationId_key" ON "VehicleEvidenceObject"("id", "organizationId");
CREATE INDEX "VehicleEvidenceObject_organizationId_checksumSha256_idx" ON "VehicleEvidenceObject"("organizationId", "checksumSha256");
CREATE INDEX "VehicleEvidenceObject_organizationId_status_retentionUntil_idx" ON "VehicleEvidenceObject"("organizationId", "status", "retentionUntil");
CREATE UNIQUE INDEX "VehicleEvidenceLink_evidenceObjectId_vehicleId_subjectType_subjectId_relationship_key" ON "VehicleEvidenceLink"("evidenceObjectId", "vehicleId", "subjectType", "subjectId", "relationship");
CREATE INDEX "VehicleEvidenceLink_organizationId_vehicleId_createdAt_idx" ON "VehicleEvidenceLink"("organizationId", "vehicleId", "createdAt");
CREATE INDEX "VehicleEvidenceLink_organizationId_subjectType_subjectId_idx" ON "VehicleEvidenceLink"("organizationId", "subjectType", "subjectId");
CREATE INDEX "VehicleEvidenceEvent_evidenceObjectId_occurredAt_idx" ON "VehicleEvidenceEvent"("evidenceObjectId", "occurredAt");
CREATE INDEX "VehicleEvidenceEvent_organizationId_eventType_occurredAt_idx" ON "VehicleEvidenceEvent"("organizationId", "eventType", "occurredAt");

ALTER TABLE "VehicleEvidenceObject" ADD CONSTRAINT "VehicleEvidenceObject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceObject" ADD CONSTRAINT "VehicleEvidenceObject_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceLink" ADD CONSTRAINT "VehicleEvidenceLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceLink" ADD CONSTRAINT "VehicleEvidenceLink_evidenceObjectId_fkey" FOREIGN KEY ("evidenceObjectId") REFERENCES "VehicleEvidenceObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceLink" ADD CONSTRAINT "VehicleEvidenceLink_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceLink" ADD CONSTRAINT "VehicleEvidenceLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceEvent" ADD CONSTRAINT "VehicleEvidenceEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceEvent" ADD CONSTRAINT "VehicleEvidenceEvent_evidenceObjectId_fkey" FOREIGN KEY ("evidenceObjectId") REFERENCES "VehicleEvidenceObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceEvent" ADD CONSTRAINT "VehicleEvidenceEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceLink" ADD CONSTRAINT "VehicleEvidenceLink_evidence_org_fkey" FOREIGN KEY ("evidenceObjectId", "organizationId") REFERENCES "VehicleEvidenceObject"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceLink" ADD CONSTRAINT "VehicleEvidenceLink_vehicle_org_fkey" FOREIGN KEY ("vehicleId", "organizationId") REFERENCES "Vehicle"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEvidenceEvent" ADD CONSTRAINT "VehicleEvidenceEvent_evidence_org_fkey" FOREIGN KEY ("evidenceObjectId", "organizationId") REFERENCES "VehicleEvidenceObject"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_vehicle_evidence_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VehicleEvidenceEvent records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VehicleEvidenceEvent_prevent_update" BEFORE UPDATE OR DELETE ON "VehicleEvidenceEvent" FOR EACH ROW EXECUTE FUNCTION prevent_vehicle_evidence_event_mutation();

CREATE OR REPLACE FUNCTION govern_vehicle_evidence_object_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD."organizationId" <> NEW."organizationId" OR OLD."uploadedByUserId" <> NEW."uploadedByUserId" OR OLD."fileName" <> NEW."fileName" OR OLD."contentType" <> NEW."contentType" OR OLD."byteSize" <> NEW."byteSize" OR OLD."checksumSha256" <> NEW."checksumSha256" OR OLD."storageProvider" <> NEW."storageProvider" OR OLD."storageKey" <> NEW."storageKey" OR OLD."malwareStatus" <> NEW."malwareStatus" OR OLD."malwareScanner" <> NEW."malwareScanner" OR OLD."malwareScannedAt" <> NEW."malwareScannedAt" THEN
    RAISE EXCEPTION 'Vehicle evidence identity, integrity, and scan fields are immutable';
  END IF;
  IF NEW."status" = 'DELETED' AND (OLD."legalHold" OR OLD."retentionUntil" > CURRENT_TIMESTAMP) THEN
    RAISE EXCEPTION 'Vehicle evidence cannot be deleted while held or before retention expiry';
  END IF;
  IF NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'Vehicle evidence updates require a single version increment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VehicleEvidenceObject_govern_update" BEFORE UPDATE ON "VehicleEvidenceObject" FOR EACH ROW EXECUTE FUNCTION govern_vehicle_evidence_object_mutation();

CREATE OR REPLACE FUNCTION prevent_vehicle_evidence_link_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VehicleEvidenceLink records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VehicleEvidenceLink_prevent_update" BEFORE UPDATE OR DELETE ON "VehicleEvidenceLink" FOR EACH ROW EXECUTE FUNCTION prevent_vehicle_evidence_link_mutation();

INSERT INTO "VehicleOperationsFeatureFlag" ("id", "organizationId", "locationId", "code", "mode", "rolloutPercent", "allowedUserIds", "version", "updatedAt")
SELECT 'vo-flag-vehicle-360-' || "id", "id", NULL, 'VEHICLE_360', 'OFF'::"VehicleOperationsRolloutMode", 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP FROM "Organization" ON CONFLICT DO NOTHING;
