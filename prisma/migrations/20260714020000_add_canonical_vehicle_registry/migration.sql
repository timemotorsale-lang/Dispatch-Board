CREATE TYPE "VehicleVinState" AS ENUM ('VALID', 'NON_VIN_EXCEPTION', 'LEGACY_UNVERIFIED');
CREATE TYPE "VehicleRelationshipType" AS ENUM ('CUSTOMER_OWNER', 'CUSTOMER_DRIVER', 'DEALERSHIP_OWNED', 'TRADE_IN', 'CONSIGNMENT', 'SOLD_TO_CUSTOMER', 'SERVICE_ONLY', 'OTHER');
CREATE TYPE "VehicleExternalIdentityConflictStatus" AS ENUM ('CLEAR', 'CONFLICT', 'SUPERSEDED');
CREATE TYPE "VehicleOdometerUnit" AS ENUM ('MILES', 'KILOMETERS');
CREATE TYPE "VehicleOdometerObservationStatus" AS ENUM ('ACCEPTED', 'EXCEPTION', 'CORRECTED');
CREATE TYPE "VehicleCustodyEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'LOT_MOVE', 'BAY_MOVE', 'TRANSPORT_PICKUP', 'TRANSPORT_DELIVERY', 'CUSTOMER_DELIVERY', 'CORRECTION');
CREATE TYPE "VehicleDuplicateCaseStatus" AS ENUM ('OPEN', 'CONFIRMED_DISTINCT', 'MERGED', 'DISMISSED');

ALTER TABLE "Vehicle" ADD COLUMN "vinRaw" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "vinState" "VehicleVinState" NOT NULL DEFAULT 'LEGACY_UNVERIFIED';
ALTER TABLE "Vehicle" ADD COLUMN "vinValidationSource" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "nonVinReason" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "stockNumberNormalized" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Vehicle" ADD COLUMN "mergedIntoVehicleId" TEXT;
ALTER TABLE "Task" ADD COLUMN "vehicleId" TEXT;

DROP INDEX IF EXISTS "Vehicle_organizationId_vin_key";

UPDATE "Vehicle" SET "vinRaw" = "vin" WHERE "vin" IS NOT NULL;

WITH normalized AS (
  SELECT "id", UPPER(REGEXP_REPLACE("vin", '[^A-Za-z0-9]', '', 'g')) AS value,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", UPPER(REGEXP_REPLACE("vin", '[^A-Za-z0-9]', '', 'g')) ORDER BY "createdAt", "id") AS rank
  FROM "Vehicle" WHERE "vin" IS NOT NULL
), classified AS (
  SELECT "id", value, rank, value ~ '^[A-HJ-NPR-Z0-9]{17}$' AS valid FROM normalized
)
UPDATE "Vehicle" AS vehicle SET
  "vin" = CASE WHEN classified.valid AND classified.rank = 1 THEN classified.value ELSE NULL END,
  "vinState" = CASE WHEN classified.valid AND classified.rank = 1 THEN 'VALID'::"VehicleVinState" ELSE 'LEGACY_UNVERIFIED'::"VehicleVinState" END,
  "vinValidationSource" = CASE WHEN classified.valid AND classified.rank = 1 THEN 'M2_MIGRATION_ISO_3779' ELSE NULL END,
  "duplicateKey" = CASE WHEN classified.valid AND classified.rank > 1 THEN 'VIN:' || classified.value ELSE vehicle."duplicateKey" END
FROM classified WHERE vehicle."id" = classified."id";

WITH normalized_stock AS (
  SELECT "id", UPPER(REGEXP_REPLACE(BTRIM("stockNumber"), '[^A-Za-z0-9]', '', 'g')) AS value,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", UPPER(REGEXP_REPLACE(BTRIM("stockNumber"), '[^A-Za-z0-9]', '', 'g')) ORDER BY "createdAt", "id") AS rank
  FROM "Vehicle" WHERE "stockNumber" IS NOT NULL AND BTRIM("stockNumber") <> ''
)
UPDATE "Vehicle" AS vehicle SET
  "stockNumberNormalized" = CASE WHEN normalized_stock.rank = 1 AND normalized_stock.value <> '' THEN normalized_stock.value ELSE NULL END,
  "duplicateKey" = CASE WHEN normalized_stock.rank > 1 THEN 'STOCK:' || normalized_stock.value ELSE vehicle."duplicateKey" END
FROM normalized_stock WHERE vehicle."id" = normalized_stock."id";

CREATE TABLE "VehicleRelationship" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "customerId" TEXT,
  "relationshipType" "VehicleRelationshipType" NOT NULL, "effectiveFrom" TIMESTAMP(3) NOT NULL, "effectiveTo" TIMESTAMP(3),
  "sourceCode" TEXT NOT NULL, "sourceReference" TEXT, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleRelationship_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VehicleExternalIdentity" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "systemCode" TEXT NOT NULL,
  "externalId" TEXT NOT NULL, "authority" TEXT NOT NULL, "mappingVersion" INTEGER NOT NULL DEFAULT 1,
  "lastSyncedAt" TIMESTAMP(3), "conflictStatus" "VehicleExternalIdentityConflictStatus" NOT NULL DEFAULT 'CLEAR',
  "conflictDetail" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleExternalIdentity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VehicleOdometerObservation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "reading" INTEGER NOT NULL,
  "unit" "VehicleOdometerUnit" NOT NULL DEFAULT 'MILES', "observedAt" TIMESTAMP(3) NOT NULL, "sourceCode" TEXT NOT NULL,
  "sourceReference" TEXT, "status" "VehicleOdometerObservationStatus" NOT NULL DEFAULT 'ACCEPTED', "exceptionReason" TEXT,
  "correctionOfId" TEXT, "recordedByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleOdometerObservation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VehicleCustodyEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "locationId" TEXT,
  "eventType" "VehicleCustodyEventType" NOT NULL, "custodianType" TEXT NOT NULL, "custodianId" TEXT,
  "positionLabel" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL, "sourceCode" TEXT NOT NULL, "sourceReference" TEXT,
  "reason" TEXT NOT NULL, "recordedByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleCustodyEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VehicleDuplicateCase" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "primaryVehicleId" TEXT NOT NULL, "candidateVehicleId" TEXT NOT NULL,
  "status" "VehicleDuplicateCaseStatus" NOT NULL DEFAULT 'OPEN', "matchReasons" JSONB NOT NULL, "confidence" INTEGER NOT NULL,
  "resolutionReason" TEXT, "resolvedByUserId" TEXT, "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleDuplicateCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_id_organizationId_key" ON "Customer"("id","organizationId");
CREATE UNIQUE INDEX "Vehicle_id_organizationId_key" ON "Vehicle"("id","organizationId");
CREATE UNIQUE INDEX "Vehicle_organizationId_vin_key" ON "Vehicle"("organizationId","vin");
CREATE UNIQUE INDEX "Vehicle_organizationId_stockNumberNormalized_key" ON "Vehicle"("organizationId","stockNumberNormalized");
CREATE INDEX "Vehicle_organizationId_licensePlate_idx" ON "Vehicle"("organizationId","licensePlate");
CREATE INDEX "Vehicle_mergedIntoVehicleId_idx" ON "Vehicle"("mergedIntoVehicleId");
CREATE UNIQUE INDEX "VehicleRelationship_organizationId_vehicleId_relationshipType_effectiveFrom_customerId_key" ON "VehicleRelationship"("organizationId","vehicleId","relationshipType","effectiveFrom","customerId");
CREATE UNIQUE INDEX "VehicleRelationship_org_vehicle_type_from_no_customer_key" ON "VehicleRelationship"("organizationId","vehicleId","relationshipType","effectiveFrom") WHERE "customerId" IS NULL;
CREATE INDEX "VehicleRelationship_organizationId_customerId_effectiveTo_idx" ON "VehicleRelationship"("organizationId","customerId","effectiveTo");
CREATE INDEX "VehicleRelationship_vehicleId_effectiveTo_idx" ON "VehicleRelationship"("vehicleId","effectiveTo");
CREATE UNIQUE INDEX "VehicleExternalIdentity_organizationId_systemCode_externalId_key" ON "VehicleExternalIdentity"("organizationId","systemCode","externalId");
CREATE INDEX "VehicleExternalIdentity_vehicleId_systemCode_idx" ON "VehicleExternalIdentity"("vehicleId","systemCode");
CREATE INDEX "VehicleExternalIdentity_organizationId_conflictStatus_idx" ON "VehicleExternalIdentity"("organizationId","conflictStatus");
CREATE INDEX "VehicleOdometerObservation_vehicleId_observedAt_idx" ON "VehicleOdometerObservation"("vehicleId","observedAt");
CREATE INDEX "VehicleOdometerObservation_organizationId_status_observedAt_idx" ON "VehicleOdometerObservation"("organizationId","status","observedAt");
CREATE INDEX "VehicleOdometerObservation_correctionOfId_idx" ON "VehicleOdometerObservation"("correctionOfId");
CREATE INDEX "VehicleCustodyEvent_vehicleId_occurredAt_idx" ON "VehicleCustodyEvent"("vehicleId","occurredAt");
CREATE INDEX "VehicleCustodyEvent_organizationId_locationId_occurredAt_idx" ON "VehicleCustodyEvent"("organizationId","locationId","occurredAt");
CREATE UNIQUE INDEX "VehicleDuplicateCase_organizationId_primaryVehicleId_candidateVehicleId_key" ON "VehicleDuplicateCase"("organizationId","primaryVehicleId","candidateVehicleId");
CREATE UNIQUE INDEX "VehicleDuplicateCase_unordered_pair_key" ON "VehicleDuplicateCase"("organizationId", LEAST("primaryVehicleId","candidateVehicleId"), GREATEST("primaryVehicleId","candidateVehicleId"));
CREATE INDEX "VehicleDuplicateCase_organizationId_status_createdAt_idx" ON "VehicleDuplicateCase"("organizationId","status","createdAt");
CREATE INDEX "Task_vehicleId_idx" ON "Task"("vehicleId");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vin_state_check" CHECK (
  ("vinState" = 'VALID' AND "vin" ~ '^[A-HJ-NPR-Z0-9]{17}$' AND "nonVinReason" IS NULL AND BTRIM(COALESCE("vinValidationSource", '')) <> '') OR
  ("vinState" = 'NON_VIN_EXCEPTION' AND "vin" IS NULL AND BTRIM(COALESCE("nonVinReason", '')) <> '' AND BTRIM(COALESCE("vinValidationSource", '')) <> '') OR
  ("vinState" = 'LEGACY_UNVERIFIED')
);
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_version_check" CHECK ("version" >= 0);
ALTER TABLE "VehicleRelationship" ADD CONSTRAINT "VehicleRelationship_dates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");
ALTER TABLE "VehicleRelationship" ADD CONSTRAINT "VehicleRelationship_customer_check" CHECK (("relationshipType" IN ('CUSTOMER_OWNER','CUSTOMER_DRIVER','SOLD_TO_CUSTOMER','SERVICE_ONLY')) = ("customerId" IS NOT NULL) OR "relationshipType" = 'OTHER');
ALTER TABLE "VehicleExternalIdentity" ADD CONSTRAINT "VehicleExternalIdentity_required_check" CHECK (BTRIM("systemCode") <> '' AND BTRIM("externalId") <> '' AND BTRIM("authority") <> '' AND "mappingVersion" > 0);
ALTER TABLE "VehicleOdometerObservation" ADD CONSTRAINT "VehicleOdometerObservation_reading_check" CHECK ("reading" >= 0);
ALTER TABLE "VehicleOdometerObservation" ADD CONSTRAINT "VehicleOdometerObservation_exception_check" CHECK (("status" = 'EXCEPTION') = (BTRIM(COALESCE("exceptionReason", '')) <> ''));
ALTER TABLE "VehicleCustodyEvent" ADD CONSTRAINT "VehicleCustodyEvent_reason_check" CHECK (BTRIM("reason") <> '' AND BTRIM("sourceCode") <> '' AND BTRIM("custodianType") <> '');
ALTER TABLE "VehicleDuplicateCase" ADD CONSTRAINT "VehicleDuplicateCase_distinct_check" CHECK ("primaryVehicleId" <> "candidateVehicleId" AND "confidence" BETWEEN 0 AND 100);
ALTER TABLE "VehicleDuplicateCase" ADD CONSTRAINT "VehicleDuplicateCase_resolution_check" CHECK (("status" = 'OPEN' AND "resolvedAt" IS NULL AND "resolvedByUserId" IS NULL) OR ("status" <> 'OPEN' AND "resolvedAt" IS NOT NULL AND "resolvedByUserId" IS NOT NULL AND BTRIM(COALESCE("resolutionReason", '')) <> ''));

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_mergedIntoVehicleId_fkey" FOREIGN KEY ("mergedIntoVehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleRelationship" ADD CONSTRAINT "VehicleRelationship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleRelationship" ADD CONSTRAINT "VehicleRelationship_vehicle_tenant_fkey" FOREIGN KEY ("vehicleId","organizationId") REFERENCES "Vehicle"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleRelationship" ADD CONSTRAINT "VehicleRelationship_customer_tenant_fkey" FOREIGN KEY ("customerId","organizationId") REFERENCES "Customer"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleExternalIdentity" ADD CONSTRAINT "VehicleExternalIdentity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleExternalIdentity" ADD CONSTRAINT "VehicleExternalIdentity_vehicle_tenant_fkey" FOREIGN KEY ("vehicleId","organizationId") REFERENCES "Vehicle"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleOdometerObservation" ADD CONSTRAINT "VehicleOdometerObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleOdometerObservation" ADD CONSTRAINT "VehicleOdometerObservation_vehicle_tenant_fkey" FOREIGN KEY ("vehicleId","organizationId") REFERENCES "Vehicle"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleOdometerObservation" ADD CONSTRAINT "VehicleOdometerObservation_correctionOfId_fkey" FOREIGN KEY ("correctionOfId") REFERENCES "VehicleOdometerObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleOdometerObservation" ADD CONSTRAINT "VehicleOdometerObservation_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleCustodyEvent" ADD CONSTRAINT "VehicleCustodyEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleCustodyEvent" ADD CONSTRAINT "VehicleCustodyEvent_vehicle_tenant_fkey" FOREIGN KEY ("vehicleId","organizationId") REFERENCES "Vehicle"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleCustodyEvent" ADD CONSTRAINT "VehicleCustodyEvent_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleCustodyEvent" ADD CONSTRAINT "VehicleCustodyEvent_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleDuplicateCase" ADD CONSTRAINT "VehicleDuplicateCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleDuplicateCase" ADD CONSTRAINT "VehicleDuplicateCase_primary_tenant_fkey" FOREIGN KEY ("primaryVehicleId","organizationId") REFERENCES "Vehicle"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleDuplicateCase" ADD CONSTRAINT "VehicleDuplicateCase_candidate_tenant_fkey" FOREIGN KEY ("candidateVehicleId","organizationId") REFERENCES "Vehicle"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleDuplicateCase" ADD CONSTRAINT "VehicleDuplicateCase_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

WITH ranked_vins AS (
  SELECT "id", "organizationId", UPPER(REGEXP_REPLACE("vinRaw", '[^A-Za-z0-9]', '', 'g')) AS normalized_vin,
    FIRST_VALUE("id") OVER (PARTITION BY "organizationId", UPPER(REGEXP_REPLACE("vinRaw", '[^A-Za-z0-9]', '', 'g')) ORDER BY "createdAt", "id") AS primary_id,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", UPPER(REGEXP_REPLACE("vinRaw", '[^A-Za-z0-9]', '', 'g')) ORDER BY "createdAt", "id") AS rank
  FROM "Vehicle" WHERE "vinRaw" IS NOT NULL AND UPPER(REGEXP_REPLACE("vinRaw", '[^A-Za-z0-9]', '', 'g')) ~ '^[A-HJ-NPR-Z0-9]{17}$'
)
INSERT INTO "VehicleDuplicateCase" ("id","organizationId","primaryVehicleId","candidateVehicleId","status","matchReasons","confidence","createdAt","updatedAt")
SELECT 'migration-dup-' || "id", "organizationId", primary_id, "id", 'OPEN', jsonb_build_array('EXACT_NORMALIZED_VIN', normalized_vin), 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM ranked_vins WHERE rank > 1 ON CONFLICT DO NOTHING;

INSERT INTO "VehicleRelationship" ("id","organizationId","vehicleId","customerId","relationshipType","effectiveFrom","effectiveTo","sourceCode","sourceReference","createdAt")
SELECT 'legacy-cv-' || cv."id", vehicle."organizationId", cv."vehicleId", cv."customerId",
  CASE
    WHEN UPPER(cv."relationshipType") IN ('OWNER','CUSTOMER_OWNER') THEN 'CUSTOMER_OWNER'::"VehicleRelationshipType"
    WHEN UPPER(cv."relationshipType") IN ('DRIVER','CUSTOMER_DRIVER') THEN 'CUSTOMER_DRIVER'::"VehicleRelationshipType"
    WHEN UPPER(cv."relationshipType") IN ('SOLD','PURCHASED','SOLD_TO_CUSTOMER') THEN 'SOLD_TO_CUSTOMER'::"VehicleRelationshipType"
    WHEN UPPER(cv."relationshipType") IN ('SERVICE','SERVICE_ONLY') THEN 'SERVICE_ONLY'::"VehicleRelationshipType"
    ELSE 'OTHER'::"VehicleRelationshipType"
  END,
  cv."effectiveFrom", cv."effectiveTo", 'LEGACY_CUSTOMER_VEHICLE', cv."id", cv."createdAt"
FROM "CustomerVehicle" cv JOIN "Vehicle" vehicle ON vehicle."id" = cv."vehicleId"
ON CONFLICT DO NOTHING;

INSERT INTO "VehicleExternalIdentity" ("id","organizationId","vehicleId","systemCode","externalId","authority","mappingVersion","conflictStatus","createdAt","updatedAt")
SELECT 'legacy-ext-' || "id", "organizationId", "id", 'LEGACY', "externalReference", 'LEGACY_APPLICATION', 1, 'CLEAR', "createdAt", "updatedAt"
FROM "Vehicle" WHERE "externalReference" IS NOT NULL ON CONFLICT DO NOTHING;

WITH exact_matches AS (
  SELECT task."id" AS task_id, MIN(vehicle."id") AS vehicle_id, COUNT(*) AS match_count
  FROM "Task" task JOIN "Vehicle" vehicle ON task."vehicleReference" IN (vehicle."vehicleNumber", vehicle."vin", vehicle."vinRaw", vehicle."stockNumber")
  WHERE task."vehicleReference" IS NOT NULL GROUP BY task."id"
)
UPDATE "Task" task SET "vehicleId" = exact_matches.vehicle_id FROM exact_matches
WHERE task."id" = exact_matches.task_id AND exact_matches.match_count = 1;
