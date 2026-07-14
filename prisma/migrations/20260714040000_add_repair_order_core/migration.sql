CREATE TYPE "RepairOrderOrigin" AS ENUM ('CUSTOMER_REPAIR','INVENTORY_RECON');
CREATE TYPE "RepairOrderIntakeSource" AS ENUM ('APPOINTMENT','WALK_IN','INVENTORY_RECON');
CREATE TYPE "RepairOrderStage" AS ENUM ('INTAKE','DIAGNOSIS','ESTIMATE','AUTHORIZATION','READY_FOR_REPAIR','REPAIR','QUALITY_CONTROL','ADVISOR_REVIEW','HANDOFF','CLOSED','CANCELLED');
CREATE TYPE "RepairOrderOperatingState" AS ENUM ('ACTIVE','WAITING','BLOCKED','CLOSED');
CREATE TYPE "RepairOrderConsentStatus" AS ENUM ('DOCUMENTED','NOT_REQUIRED','PENDING');
CREATE TYPE "RepairOrderTransportMode" AS ENUM ('CUSTOMER_WAITING','DROP_OFF','LOANER','SHUTTLE','TOW','INTERNAL_TRANSPORT','OTHER');
CREATE TYPE "RepairOrderEventSource" AS ENUM ('USER','SYSTEM','INTEGRATION','MIGRATION');

CREATE TABLE "ServiceVisit" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL, "customerId" TEXT, "appointmentId" TEXT,
  "inventoryUnitId" TEXT, "origin" "RepairOrderOrigin" NOT NULL,
  "intakeSource" "RepairOrderIntakeSource" NOT NULL, "arrivedAt" TIMESTAMP(3) NOT NULL,
  "concernSummary" TEXT NOT NULL, "promisedAt" TIMESTAMP(3), "promiseNotes" TEXT,
  "consentStatus" "RepairOrderConsentStatus" NOT NULL, "consentReference" TEXT,
  "consentedAt" TIMESTAMP(3), "keysReceivedCount" INTEGER NOT NULL DEFAULT 0,
  "keyTag" TEXT, "transportMode" "RepairOrderTransportMode" NOT NULL,
  "intakeNotes" TEXT, "sourceSnapshot" JSONB, "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceVisit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceVisit_origin_source_check" CHECK (
    ("origin"='CUSTOMER_REPAIR' AND "customerId" IS NOT NULL AND "inventoryUnitId" IS NULL AND "intakeSource" IN ('APPOINTMENT','WALK_IN')) OR
    ("origin"='INVENTORY_RECON' AND "customerId" IS NULL AND "inventoryUnitId" IS NOT NULL AND "intakeSource"='INVENTORY_RECON')
  ),
  CONSTRAINT "ServiceVisit_keys_check" CHECK ("keysReceivedCount" BETWEEN 0 AND 20),
  CONSTRAINT "ServiceVisit_consent_check" CHECK (("consentStatus" <> 'DOCUMENTED') OR ("consentReference" IS NOT NULL AND "consentedAt" IS NOT NULL))
);

CREATE TABLE "RepairOrder" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT NOT NULL,
  "serviceVisitId" TEXT NOT NULL, "repairOrderNumber" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "customerId" TEXT, "inventoryUnitId" TEXT, "origin" "RepairOrderOrigin" NOT NULL,
  "intakeSource" "RepairOrderIntakeSource" NOT NULL, "stage" "RepairOrderStage" NOT NULL DEFAULT 'INTAKE',
  "operatingState" "RepairOrderOperatingState" NOT NULL DEFAULT 'ACTIVE',
  "openedAt" TIMESTAMP(3) NOT NULL, "stageStartedAt" TIMESTAMP(3) NOT NULL,
  "ownerUserId" TEXT NOT NULL, "targetAt" TIMESTAMP(3) NOT NULL, "nextAction" TEXT NOT NULL,
  "stateReason" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "closedAt" TIMESTAMP(3),
  "externalSystemCode" TEXT, "externalReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepairOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairOrder_origin_check" CHECK (
    ("origin"='CUSTOMER_REPAIR' AND "customerId" IS NOT NULL AND "inventoryUnitId" IS NULL) OR
    ("origin"='INVENTORY_RECON' AND "customerId" IS NULL AND "inventoryUnitId" IS NOT NULL)
  ),
  CONSTRAINT "RepairOrder_foundation_stage_check" CHECK ("stage"='INTAKE' AND "operatingState" IN ('ACTIVE','WAITING','BLOCKED') AND "closedAt" IS NULL),
  CONSTRAINT "RepairOrder_state_reason_check" CHECK (("operatingState"='ACTIVE' AND "stateReason" IS NULL) OR ("operatingState" IN ('WAITING','BLOCKED') AND length(trim("stateReason")) >= 10))
);

CREATE TABLE "RepairOrderStateEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "fromStage" "RepairOrderStage", "toStage" "RepairOrderStage" NOT NULL,
  "fromOperatingState" "RepairOrderOperatingState", "toOperatingState" "RepairOrderOperatingState" NOT NULL,
  "ownerUserId" TEXT NOT NULL, "locationId" TEXT NOT NULL, "targetAt" TIMESTAMP(3) NOT NULL,
  "nextAction" TEXT NOT NULL, "reason" TEXT NOT NULL, "source" "RepairOrderEventSource" NOT NULL DEFAULT 'USER',
  "actorUserId" TEXT NOT NULL, "correlationId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepairOrderStateEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceVisit_appointmentId_key" ON "ServiceVisit"("appointmentId");
CREATE UNIQUE INDEX "ServiceVisit_id_organizationId_key" ON "ServiceVisit"("id","organizationId");
CREATE INDEX "ServiceVisit_organizationId_arrivedAt_idx" ON "ServiceVisit"("organizationId","arrivedAt");
CREATE INDEX "ServiceVisit_vehicleId_arrivedAt_idx" ON "ServiceVisit"("vehicleId","arrivedAt");
CREATE INDEX "ServiceVisit_customerId_arrivedAt_idx" ON "ServiceVisit"("customerId","arrivedAt");
CREATE INDEX "ServiceVisit_inventoryUnitId_arrivedAt_idx" ON "ServiceVisit"("inventoryUnitId","arrivedAt");
CREATE UNIQUE INDEX "RepairOrder_serviceVisitId_key" ON "RepairOrder"("serviceVisitId");
CREATE UNIQUE INDEX "RepairOrder_organizationId_repairOrderNumber_key" ON "RepairOrder"("organizationId","repairOrderNumber");
CREATE UNIQUE INDEX "RepairOrder_id_organizationId_key" ON "RepairOrder"("id","organizationId");
CREATE UNIQUE INDEX "RepairOrder_external_identity_key" ON "RepairOrder"("organizationId","externalSystemCode","externalReference");
CREATE INDEX "RepairOrder_organizationId_stage_operatingState_targetAt_idx" ON "RepairOrder"("organizationId","stage","operatingState","targetAt");
CREATE INDEX "RepairOrder_organizationId_ownerUserId_targetAt_idx" ON "RepairOrder"("organizationId","ownerUserId","targetAt");
CREATE INDEX "RepairOrder_organizationId_locationId_stage_idx" ON "RepairOrder"("organizationId","locationId","stage");
CREATE INDEX "RepairOrder_vehicleId_closedAt_idx" ON "RepairOrder"("vehicleId","closedAt");
CREATE UNIQUE INDEX "RepairOrderStateEvent_repairOrderId_version_key" ON "RepairOrderStateEvent"("repairOrderId","version");
CREATE INDEX "RepairOrderStateEvent_organizationId_occurredAt_idx" ON "RepairOrderStateEvent"("organizationId","occurredAt");
CREATE INDEX "RepairOrderStateEvent_correlationId_idx" ON "RepairOrderStateEvent"("correlationId");
CREATE INDEX "RepairOrderStateEvent_ownerUserId_occurredAt_idx" ON "RepairOrderStateEvent"("ownerUserId","occurredAt");

ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_serviceVisitId_fkey" FOREIGN KEY ("serviceVisitId") REFERENCES "ServiceVisit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderStateEvent" ADD CONSTRAINT "RepairOrderStateEvent_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderStateEvent" ADD CONSTRAINT "RepairOrderStateEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderStateEvent" ADD CONSTRAINT "RepairOrderStateEvent_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderStateEvent" ADD CONSTRAINT "RepairOrderStateEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairOrderStateEvent" ADD CONSTRAINT "RepairOrderStateEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_repair_order_intake_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'ServiceVisit intake evidence is immutable'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "ServiceVisit_prevent_update" BEFORE UPDATE OR DELETE ON "ServiceVisit" FOR EACH ROW EXECUTE FUNCTION prevent_repair_order_intake_mutation();
CREATE FUNCTION prevent_repair_order_state_event_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'RepairOrderStateEvent is immutable'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "RepairOrderStateEvent_prevent_update" BEFORE UPDATE OR DELETE ON "RepairOrderStateEvent" FOR EACH ROW EXECUTE FUNCTION prevent_repair_order_state_event_mutation();

INSERT INTO "VehicleOperationsFeatureFlag" ("id","organizationId","locationId","code","mode","rolloutPercent","allowedUserIds","version","updatedAt")
SELECT 'vo-flag-shop-' || "id", "id", NULL, 'SHOP_OPERATIONS', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP FROM "Organization"
ON CONFLICT DO NOTHING;
