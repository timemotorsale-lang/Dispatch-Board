CREATE TYPE "InventoryUnitLifecycleStage" AS ENUM ('PURCHASED_OR_TRADE_IN','TRANSPORTATION','RECEIVED','INSPECTION','RECONDITIONING','TITLE_DOCUMENT_READINESS','PHOTOGRAPHY_MERCHANDISING','FRONTLINE_READY','RESERVED_DEAL_PENDING','SOLD','DELIVERED','WHOLESALED_OR_OTHER_DISPOSITION');
CREATE TYPE "InventoryUnitOperatingState" AS ENUM ('ACTIVE','WAITING','BLOCKED','CLOSED');
CREATE TYPE "InventoryUnitEventSource" AS ENUM ('USER','SYSTEM','INTEGRATION','MIGRATION');

CREATE TABLE "InventoryUnit" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "inventoryNumber" TEXT NOT NULL,
  "lifecycleStage" "InventoryUnitLifecycleStage" NOT NULL DEFAULT 'PURCHASED_OR_TRADE_IN',
  "operatingState" "InventoryUnitOperatingState" NOT NULL DEFAULT 'ACTIVE',
  "financialAcquiredAt" TIMESTAMP(3) NOT NULL,
  "stageStartedAt" TIMESTAMP(3) NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "targetAt" TIMESTAMP(3) NOT NULL,
  "nextAction" TEXT NOT NULL,
  "stateReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryUnitStateEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "inventoryUnitId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "fromStage" "InventoryUnitLifecycleStage",
  "toStage" "InventoryUnitLifecycleStage" NOT NULL,
  "fromOperatingState" "InventoryUnitOperatingState",
  "toOperatingState" "InventoryUnitOperatingState" NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "targetAt" TIMESTAMP(3) NOT NULL,
  "nextAction" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "source" "InventoryUnitEventSource" NOT NULL DEFAULT 'USER',
  "actorUserId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryUnitStateEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryUnit_organizationId_inventoryNumber_key" ON "InventoryUnit"("organizationId","inventoryNumber");
CREATE UNIQUE INDEX "InventoryUnit_id_organizationId_key" ON "InventoryUnit"("id","organizationId");
CREATE UNIQUE INDEX "InventoryUnit_one_open_unit_per_vehicle_key" ON "InventoryUnit"("organizationId","vehicleId") WHERE "closedAt" IS NULL;
CREATE INDEX "InventoryUnit_organizationId_lifecycleStage_operatingState_targetAt_idx" ON "InventoryUnit"("organizationId","lifecycleStage","operatingState","targetAt");
CREATE INDEX "InventoryUnit_organizationId_ownerUserId_targetAt_idx" ON "InventoryUnit"("organizationId","ownerUserId","targetAt");
CREATE INDEX "InventoryUnit_organizationId_locationId_lifecycleStage_idx" ON "InventoryUnit"("organizationId","locationId","lifecycleStage");
CREATE INDEX "InventoryUnit_vehicleId_closedAt_idx" ON "InventoryUnit"("vehicleId","closedAt");
CREATE UNIQUE INDEX "InventoryUnitStateEvent_inventoryUnitId_version_key" ON "InventoryUnitStateEvent"("inventoryUnitId","version");
CREATE INDEX "InventoryUnitStateEvent_organizationId_occurredAt_idx" ON "InventoryUnitStateEvent"("organizationId","occurredAt");
CREATE INDEX "InventoryUnitStateEvent_correlationId_idx" ON "InventoryUnitStateEvent"("correlationId");
CREATE INDEX "InventoryUnitStateEvent_ownerUserId_occurredAt_idx" ON "InventoryUnitStateEvent"("ownerUserId","occurredAt");

ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_required_text_check" CHECK (BTRIM("inventoryNumber") <> '' AND BTRIM("nextAction") <> '');
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_version_check" CHECK ("version" > 0);
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_timeline_check" CHECK ("stageStartedAt" >= "financialAcquiredAt" AND "targetAt" >= "financialAcquiredAt");
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_operating_state_check" CHECK (
  ("operatingState" = 'ACTIVE' AND "closedAt" IS NULL AND "stateReason" IS NULL) OR
  ("operatingState" IN ('WAITING','BLOCKED') AND "closedAt" IS NULL AND BTRIM(COALESCE("stateReason", '')) <> '') OR
  ("operatingState" = 'CLOSED' AND "closedAt" IS NOT NULL AND BTRIM(COALESCE("stateReason", '')) <> '')
);
ALTER TABLE "InventoryUnitStateEvent" ADD CONSTRAINT "InventoryUnitStateEvent_required_text_check" CHECK (BTRIM("nextAction") <> '' AND BTRIM("reason") <> '' AND BTRIM("correlationId") <> '');
ALTER TABLE "InventoryUnitStateEvent" ADD CONSTRAINT "InventoryUnitStateEvent_version_check" CHECK ("version" > 0 AND (("version" = 1 AND "fromStage" IS NULL AND "fromOperatingState" IS NULL) OR ("version" > 1 AND "fromStage" IS NOT NULL AND "fromOperatingState" IS NOT NULL)));

ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_vehicle_tenant_fkey" FOREIGN KEY ("vehicleId","organizationId") REFERENCES "Vehicle"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitStateEvent" ADD CONSTRAINT "InventoryUnitStateEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitStateEvent" ADD CONSTRAINT "InventoryUnitStateEvent_inventory_unit_tenant_fkey" FOREIGN KEY ("inventoryUnitId","organizationId") REFERENCES "InventoryUnit"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitStateEvent" ADD CONSTRAINT "InventoryUnitStateEvent_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitStateEvent" ADD CONSTRAINT "InventoryUnitStateEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitStateEvent" ADD CONSTRAINT "InventoryUnitStateEvent_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_inventory_unit_state_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'InventoryUnitStateEvent is immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "InventoryUnitStateEvent_prevent_update" BEFORE UPDATE ON "InventoryUnitStateEvent" FOR EACH ROW EXECUTE FUNCTION prevent_inventory_unit_state_event_mutation();
CREATE TRIGGER "InventoryUnitStateEvent_prevent_delete" BEFORE DELETE ON "InventoryUnitStateEvent" FOR EACH ROW EXECUTE FUNCTION prevent_inventory_unit_state_event_mutation();

INSERT INTO "VehicleOperationsFeatureFlag" ("id","organizationId","locationId","code","mode","rolloutPercent","allowedUserIds","version","updatedAt")
SELECT 'vo-flag-retail-' || "id", "id", NULL, 'RETAIL_INVENTORY', 'OFF'::"VehicleOperationsRolloutMode", 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP FROM "Organization"
ON CONFLICT DO NOTHING;
