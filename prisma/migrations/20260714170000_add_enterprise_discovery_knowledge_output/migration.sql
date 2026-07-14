-- Wave 3 / VEH-094 through VEH-096: discovery, governed knowledge, and controlled output.
CREATE TYPE "WorkKnowledgeType" AS ENUM ('PROCEDURE','BULLETIN','SAFETY_NOTE','REFERENCE');
CREATE TYPE "WorkKnowledgeStatus" AS ENUM ('DRAFT','APPROVED','SUPERSEDED','RETIRED');
CREATE TYPE "WorkKnowledgeEventType" AS ENUM ('CREATED','APPROVED','SUPERSEDED','RETIRED');
CREATE TYPE "VehicleOutputFormat" AS ENUM ('JSON','PRINT_HTML');
CREATE TYPE "VehicleOutputClassification" AS ENUM ('INTERNAL','RESTRICTED');
CREATE TYPE "VehicleOutputEventType" AS ENUM ('GENERATED','DOWNLOADED');

CREATE TABLE "WorkKnowledgeLink" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "workTypeCode" TEXT NOT NULL, "procedureVersionId" TEXT,
  "type" "WorkKnowledgeType" NOT NULL, "status" "WorkKnowledgeStatus" NOT NULL DEFAULT 'DRAFT', "title" TEXT NOT NULL,
  "uri" TEXT NOT NULL, "sourceOrganization" TEXT NOT NULL, "sourceReference" TEXT NOT NULL, "revision" TEXT NOT NULL,
  "contentHashSha256" TEXT NOT NULL, "authority" TEXT NOT NULL DEFAULT 'REFERENCE_ONLY', "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3), "supersedesId" TEXT, "createdByUserId" TEXT NOT NULL, "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3), "reason" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkKnowledgeLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkKnowledgeLink_identity_check" CHECK (length(btrim("workTypeCode")) > 0 AND length(btrim("title")) > 0 AND length(btrim("sourceOrganization")) > 0 AND length(btrim("sourceReference")) > 0 AND length(btrim("revision")) > 0),
  CONSTRAINT "WorkKnowledgeLink_uri_check" CHECK ("uri" ~ '^https://[^/@:]+([^@]*)$'),
  CONSTRAINT "WorkKnowledgeLink_hash_check" CHECK ("contentHashSha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "WorkKnowledgeLink_authority_check" CHECK ("authority" = 'REFERENCE_ONLY'),
  CONSTRAINT "WorkKnowledgeLink_effective_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"),
  CONSTRAINT "WorkKnowledgeLink_approval_check" CHECK (("status" = 'APPROVED' AND "approvedByUserId" IS NOT NULL AND "approvedAt" IS NOT NULL AND "approvedByUserId" <> "createdByUserId") OR ("status" <> 'APPROVED')),
  CONSTRAINT "WorkKnowledgeLink_version_check" CHECK ("version" > 0),
  CONSTRAINT "WorkKnowledgeLink_reason_check" CHECK (length(btrim("reason")) >= 10),
  CONSTRAINT "WorkKnowledgeLink_supersedes_check" CHECK ("supersedesId" IS NULL OR "supersedesId" <> "id")
);
CREATE TABLE "WorkKnowledgeEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "knowledgeLinkId" TEXT NOT NULL, "actorUserId" TEXT NOT NULL,
  "eventType" "WorkKnowledgeEventType" NOT NULL, "reason" TEXT NOT NULL, "metadata" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkKnowledgeEvent_pkey" PRIMARY KEY ("id"), CONSTRAINT "WorkKnowledgeEvent_reason_check" CHECK (length(btrim("reason")) >= 10),
  CONSTRAINT "WorkKnowledgeEvent_metadata_check" CHECK (jsonb_typeof("metadata") = 'object')
);
CREATE TABLE "VehicleControlledOutput" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "requestedByUserId" TEXT NOT NULL,
  "format" "VehicleOutputFormat" NOT NULL, "classification" "VehicleOutputClassification" NOT NULL, "reason" TEXT NOT NULL,
  "watermark" TEXT NOT NULL, "fieldManifest" JSONB NOT NULL, "redactedFields" JSONB NOT NULL, "packageSnapshot" JSONB NOT NULL,
  "checksumSha256" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleControlledOutput_pkey" PRIMARY KEY ("id"), CONSTRAINT "VehicleControlledOutput_reason_check" CHECK (length(btrim("reason")) >= 10),
  CONSTRAINT "VehicleControlledOutput_watermark_check" CHECK (length(btrim("watermark")) >= 10 AND position(lower("classification"::text) in lower("watermark")) > 0),
  CONSTRAINT "VehicleControlledOutput_manifest_check" CHECK (jsonb_typeof("fieldManifest") = 'array' AND jsonb_typeof("redactedFields") = 'array' AND jsonb_typeof("packageSnapshot") = 'object'),
  CONSTRAINT "VehicleControlledOutput_hash_check" CHECK ("checksumSha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "VehicleControlledOutput_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE TABLE "VehicleControlledOutputEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "outputId" TEXT NOT NULL, "actorUserId" TEXT NOT NULL,
  "eventType" "VehicleOutputEventType" NOT NULL, "reason" TEXT NOT NULL, "metadata" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleControlledOutputEvent_pkey" PRIMARY KEY ("id"), CONSTRAINT "VehicleControlledOutputEvent_reason_check" CHECK (length(btrim("reason")) >= 10),
  CONSTRAINT "VehicleControlledOutputEvent_metadata_check" CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE UNIQUE INDEX "WorkKnowledgeLink_organizationId_sourceOrganization_sourceReference_revision_key" ON "WorkKnowledgeLink"("organizationId","sourceOrganization","sourceReference","revision");
CREATE UNIQUE INDEX "WorkKnowledgeLink_supersedesId_key" ON "WorkKnowledgeLink"("supersedesId");
CREATE INDEX "WorkKnowledgeLink_organizationId_workTypeCode_status_effectiveFrom_effectiveTo_idx" ON "WorkKnowledgeLink"("organizationId","workTypeCode","status","effectiveFrom","effectiveTo");
CREATE INDEX "WorkKnowledgeLink_procedureVersionId_status_idx" ON "WorkKnowledgeLink"("procedureVersionId","status");
CREATE INDEX "WorkKnowledgeEvent_knowledgeLinkId_occurredAt_idx" ON "WorkKnowledgeEvent"("knowledgeLinkId","occurredAt");
CREATE INDEX "WorkKnowledgeEvent_organizationId_eventType_occurredAt_idx" ON "WorkKnowledgeEvent"("organizationId","eventType","occurredAt");
CREATE UNIQUE INDEX "VehicleControlledOutput_organizationId_checksumSha256_key" ON "VehicleControlledOutput"("organizationId","checksumSha256");
CREATE INDEX "VehicleControlledOutput_organizationId_vehicleId_createdAt_idx" ON "VehicleControlledOutput"("organizationId","vehicleId","createdAt");
CREATE INDEX "VehicleControlledOutput_organizationId_expiresAt_idx" ON "VehicleControlledOutput"("organizationId","expiresAt");
CREATE INDEX "VehicleControlledOutputEvent_outputId_occurredAt_idx" ON "VehicleControlledOutputEvent"("outputId","occurredAt");
CREATE INDEX "VehicleControlledOutputEvent_organizationId_eventType_occurredAt_idx" ON "VehicleControlledOutputEvent"("organizationId","eventType","occurredAt");

ALTER TABLE "WorkKnowledgeLink" ADD CONSTRAINT "WorkKnowledgeLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkKnowledgeLink" ADD CONSTRAINT "WorkKnowledgeLink_procedureVersionId_fkey" FOREIGN KEY ("procedureVersionId") REFERENCES "WorkProcedureVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkKnowledgeLink" ADD CONSTRAINT "WorkKnowledgeLink_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "WorkKnowledgeLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkKnowledgeLink" ADD CONSTRAINT "WorkKnowledgeLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkKnowledgeLink" ADD CONSTRAINT "WorkKnowledgeLink_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkKnowledgeEvent" ADD CONSTRAINT "WorkKnowledgeEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkKnowledgeEvent" ADD CONSTRAINT "WorkKnowledgeEvent_knowledgeLinkId_fkey" FOREIGN KEY ("knowledgeLinkId") REFERENCES "WorkKnowledgeLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkKnowledgeEvent" ADD CONSTRAINT "WorkKnowledgeEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleControlledOutput" ADD CONSTRAINT "VehicleControlledOutput_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleControlledOutput" ADD CONSTRAINT "VehicleControlledOutput_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleControlledOutput" ADD CONSTRAINT "VehicleControlledOutput_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleControlledOutputEvent" ADD CONSTRAINT "VehicleControlledOutputEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleControlledOutputEvent" ADD CONSTRAINT "VehicleControlledOutputEvent_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "VehicleControlledOutput"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleControlledOutputEvent" ADD CONSTRAINT "VehicleControlledOutputEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_wave_three_evidence_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Wave 3 evidence records are immutable'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "WorkKnowledgeEvent_prevent_mutation" BEFORE UPDATE OR DELETE ON "WorkKnowledgeEvent" FOR EACH ROW EXECUTE FUNCTION prevent_wave_three_evidence_mutation();
CREATE TRIGGER "VehicleControlledOutput_prevent_mutation" BEFORE UPDATE OR DELETE ON "VehicleControlledOutput" FOR EACH ROW EXECUTE FUNCTION prevent_wave_three_evidence_mutation();
CREATE TRIGGER "VehicleControlledOutputEvent_prevent_mutation" BEFORE UPDATE OR DELETE ON "VehicleControlledOutputEvent" FOR EACH ROW EXECUTE FUNCTION prevent_wave_three_evidence_mutation();

CREATE OR REPLACE FUNCTION govern_work_knowledge_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD."organizationId" <> NEW."organizationId" OR OLD."workTypeCode" <> NEW."workTypeCode" OR OLD."type" <> NEW."type" OR OLD."uri" <> NEW."uri" OR OLD."sourceOrganization" <> NEW."sourceOrganization" OR OLD."sourceReference" <> NEW."sourceReference" OR OLD."revision" <> NEW."revision" OR OLD."contentHashSha256" <> NEW."contentHashSha256" OR OLD."authority" <> NEW."authority" OR OLD."createdByUserId" <> NEW."createdByUserId" THEN RAISE EXCEPTION 'Knowledge identity and source evidence are immutable'; END IF;
  IF NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'Knowledge updates require one version increment'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "WorkKnowledgeLink_govern_update" BEFORE UPDATE ON "WorkKnowledgeLink" FOR EACH ROW EXECUTE FUNCTION govern_work_knowledge_mutation();

-- Trigram indexes keep capped cross-domain discovery responsive while every query remains organization-scoped.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Vehicle_vehicleNumber_trgm_idx" ON "Vehicle" USING GIN ("vehicleNumber" gin_trgm_ops);
CREATE INDEX "Vehicle_vin_trgm_idx" ON "Vehicle" USING GIN ("vin" gin_trgm_ops);
CREATE INDEX "Vehicle_stockNumber_trgm_idx" ON "Vehicle" USING GIN ("stockNumber" gin_trgm_ops);
CREATE INDEX "Vehicle_licensePlate_trgm_idx" ON "Vehicle" USING GIN ("licensePlate" gin_trgm_ops);
CREATE INDEX "Customer_customerNumber_trgm_idx" ON "Customer" USING GIN ("customerNumber" gin_trgm_ops);
CREATE INDEX "Customer_displayName_trgm_idx" ON "Customer" USING GIN ("displayName" gin_trgm_ops);
CREATE INDEX "RepairOrder_repairOrderNumber_trgm_idx" ON "RepairOrder" USING GIN ("repairOrderNumber" gin_trgm_ops);
CREATE INDEX "RepairJob_jobNumber_trgm_idx" ON "RepairJob" USING GIN ("jobNumber" gin_trgm_ops);
CREATE INDEX "RepairJob_description_trgm_idx" ON "RepairJob" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "Appointment_appointmentNumber_trgm_idx" ON "Appointment" USING GIN ("appointmentNumber" gin_trgm_ops);
CREATE INDEX "Appointment_title_trgm_idx" ON "Appointment" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Part_partNumber_trgm_idx" ON "Part" USING GIN ("partNumber" gin_trgm_ops);
CREATE INDEX "Part_description_trgm_idx" ON "Part" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "PartPurchaseOrder_purchaseOrderNumber_trgm_idx" ON "PartPurchaseOrder" USING GIN ("purchaseOrderNumber" gin_trgm_ops);
CREATE INDEX "VehicleEvidenceObject_fileName_trgm_idx" ON "VehicleEvidenceObject" USING GIN ("fileName" gin_trgm_ops);

INSERT INTO "VehicleOperationsFeatureFlag" ("id","organizationId","locationId","code","mode","rolloutPercent","allowedUserIds","version","updatedAt")
SELECT 'vo-flag-discovery-' || "id", "id", NULL, 'VEHICLE_DISCOVERY', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP FROM "Organization" ON CONFLICT DO NOTHING;
