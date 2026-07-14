CREATE TYPE "PartStatus" AS ENUM ('ACTIVE','INACTIVE','SUPERSEDED');
CREATE TYPE "PartStockLocationType" AS ENUM ('WAREHOUSE','BIN','STAGING','DAMAGED');
CREATE TYPE "PartLedgerMovementType" AS ENUM ('RECEIPT','RESERVE','RELEASE','ISSUE','INSTALL','RETURN','ADJUST','COUNT','REVERSAL');
CREATE TYPE "PartDemandStatus" AS ENUM ('OPEN','PARTIALLY_RESERVED','RESERVED','RELEASED','CANCELLED');
CREATE TYPE "PartReservationStatus" AS ENUM ('ACTIVE','RELEASED','CONSUMED');

CREATE TABLE "Part" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "partNumber" TEXT NOT NULL,
  "manufacturerCode" TEXT, "description" TEXT NOT NULL, "unitOfMeasure" TEXT NOT NULL DEFAULT 'EACH',
  "categoryCode" TEXT, "status" "PartStatus" NOT NULL DEFAULT 'ACTIVE', "supersededByPartId" TEXT,
  "standardCostCents" INTEGER NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Part_pkey" PRIMARY KEY ("id"), CONSTRAINT "Part_cost_check" CHECK ("standardCostCents" >= 0)
);
CREATE TABLE "PartStockLocation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT NOT NULL, "code" TEXT NOT NULL,
  "name" TEXT NOT NULL, "type" "PartStockLocationType" NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartStockLocation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PartStockBalance" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "partId" TEXT NOT NULL, "stockLocationId" TEXT NOT NULL,
  "onHandQuantity" INTEGER NOT NULL DEFAULT 0, "allocatedQuantity" INTEGER NOT NULL DEFAULT 0,
  "availableQuantity" INTEGER NOT NULL DEFAULT 0, "orderedQuantity" INTEGER NOT NULL DEFAULT 0,
  "backorderedQuantity" INTEGER NOT NULL DEFAULT 0, "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
  "averageCostCents" INTEGER NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PartStockBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartStockBalance_nonnegative_check" CHECK ("onHandQuantity" >= 0 AND "allocatedQuantity" >= 0 AND "availableQuantity" >= 0 AND "orderedQuantity" >= 0 AND "backorderedQuantity" >= 0 AND "damagedQuantity" >= 0 AND "averageCostCents" >= 0),
  CONSTRAINT "PartStockBalance_equation_check" CHECK ("availableQuantity" = "onHandQuantity" - "allocatedQuantity" - "damagedQuantity")
);
CREATE TABLE "PartStockLedgerEntry" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "partId" TEXT NOT NULL, "stockLocationId" TEXT NOT NULL,
  "movementType" "PartLedgerMovementType" NOT NULL, "quantityDelta" INTEGER NOT NULL,
  "allocatedDelta" INTEGER NOT NULL DEFAULT 0, "unitCostCents" INTEGER NOT NULL,
  "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "reversalOfEntryId" TEXT,
  "actorUserId" TEXT NOT NULL, "reason" TEXT NOT NULL, "correlationId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartStockLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartStockLedgerEntry_value_check" CHECK (("quantityDelta" <> 0 OR "allocatedDelta" <> 0) AND "unitCostCents" >= 0 AND length(trim("reason")) >= 10),
  CONSTRAINT "PartStockLedgerEntry_movement_check" CHECK (
    ("movementType"='RESERVE' AND "quantityDelta"=0 AND "allocatedDelta">0) OR
    ("movementType"='RELEASE' AND "quantityDelta"=0 AND "allocatedDelta"<0) OR
    ("movementType" NOT IN ('RESERVE','RELEASE'))
  )
);
CREATE TABLE "RepairPartDemand" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "repairJobReference" TEXT,
  "partId" TEXT NOT NULL, "quantityRequired" INTEGER NOT NULL, "quantityReserved" INTEGER NOT NULL DEFAULT 0,
  "requiredAt" TIMESTAMP(3) NOT NULL, "substitutionAllowed" BOOLEAN NOT NULL DEFAULT false,
  "status" "PartDemandStatus" NOT NULL DEFAULT 'OPEN', "notes" TEXT, "createdByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RepairPartDemand_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairPartDemand_quantity_check" CHECK ("quantityRequired" > 0 AND "quantityReserved" >= 0 AND "quantityReserved" <= "quantityRequired")
);
CREATE TABLE "PartReservation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "demandId" TEXT NOT NULL, "partId" TEXT NOT NULL,
  "stockLocationId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "status" "PartReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "actorUserId" TEXT NOT NULL, "reason" TEXT NOT NULL, "correlationId" TEXT NOT NULL, "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartReservation_pkey" PRIMARY KEY ("id"), CONSTRAINT "PartReservation_quantity_check" CHECK ("quantity" > 0)
);
CREATE TABLE "RepairReadinessEvaluation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "ready" BOOLEAN NOT NULL,
  "requiredQuantity" INTEGER NOT NULL, "reservedQuantity" INTEGER NOT NULL, "reasonCodes" JSONB NOT NULL,
  "inputFingerprint" TEXT NOT NULL, "evaluatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RepairReadinessEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairReadinessEvaluation_quantity_check" CHECK ("requiredQuantity" >= 0 AND "reservedQuantity" >= 0 AND "reservedQuantity" <= "requiredQuantity")
);

CREATE UNIQUE INDEX "Part_organizationId_partNumber_key" ON "Part"("organizationId","partNumber");
CREATE UNIQUE INDEX "Part_id_organizationId_key" ON "Part"("id","organizationId");
CREATE INDEX "Part_organizationId_description_idx" ON "Part"("organizationId","description");
CREATE INDEX "Part_supersededByPartId_idx" ON "Part"("supersededByPartId");
CREATE UNIQUE INDEX "PartStockLocation_organizationId_code_key" ON "PartStockLocation"("organizationId","code");
CREATE UNIQUE INDEX "PartStockLocation_id_organizationId_key" ON "PartStockLocation"("id","organizationId");
CREATE INDEX "PartStockLocation_organizationId_locationId_isActive_idx" ON "PartStockLocation"("organizationId","locationId","isActive");
CREATE UNIQUE INDEX "PartStockBalance_partId_stockLocationId_key" ON "PartStockBalance"("partId","stockLocationId");
CREATE INDEX "PartStockBalance_organizationId_availableQuantity_idx" ON "PartStockBalance"("organizationId","availableQuantity");
CREATE UNIQUE INDEX "PartStockLedgerEntry_reversalOfEntryId_key" ON "PartStockLedgerEntry"("reversalOfEntryId");
CREATE UNIQUE INDEX "PartStockLedgerEntry_source_key" ON "PartStockLedgerEntry"("organizationId","sourceType","sourceId","movementType");
CREATE INDEX "PartStockLedgerEntry_organizationId_partId_occurredAt_idx" ON "PartStockLedgerEntry"("organizationId","partId","occurredAt");
CREATE INDEX "PartStockLedgerEntry_stockLocationId_occurredAt_idx" ON "PartStockLedgerEntry"("stockLocationId","occurredAt");
CREATE INDEX "PartStockLedgerEntry_correlationId_idx" ON "PartStockLedgerEntry"("correlationId");
CREATE UNIQUE INDEX "RepairPartDemand_order_part_job_key" ON "RepairPartDemand"("repairOrderId","partId","repairJobReference");
CREATE UNIQUE INDEX "RepairPartDemand_order_part_unassigned_key" ON "RepairPartDemand"("repairOrderId","partId") WHERE "repairJobReference" IS NULL AND "status" NOT IN ('CANCELLED','RELEASED');
CREATE INDEX "RepairPartDemand_organizationId_status_requiredAt_idx" ON "RepairPartDemand"("organizationId","status","requiredAt");
CREATE INDEX "RepairPartDemand_partId_status_requiredAt_idx" ON "RepairPartDemand"("partId","status","requiredAt");
CREATE INDEX "PartReservation_organizationId_status_createdAt_idx" ON "PartReservation"("organizationId","status","createdAt");
CREATE INDEX "PartReservation_demandId_status_idx" ON "PartReservation"("demandId","status");
CREATE INDEX "PartReservation_stockLocationId_status_idx" ON "PartReservation"("stockLocationId","status");
CREATE INDEX "RepairReadinessEvaluation_organizationId_ready_evaluatedAt_idx" ON "RepairReadinessEvaluation"("organizationId","ready","evaluatedAt");
CREATE INDEX "RepairReadinessEvaluation_repairOrderId_evaluatedAt_idx" ON "RepairReadinessEvaluation"("repairOrderId","evaluatedAt");

ALTER TABLE "Part" ADD CONSTRAINT "Part_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Part" ADD CONSTRAINT "Part_supersededByPartId_fkey" FOREIGN KEY ("supersededByPartId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockLocation" ADD CONSTRAINT "PartStockLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockLocation" ADD CONSTRAINT "PartStockLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockBalance" ADD CONSTRAINT "PartStockBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockBalance" ADD CONSTRAINT "PartStockBalance_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockBalance" ADD CONSTRAINT "PartStockBalance_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockLedgerEntry" ADD CONSTRAINT "PartStockLedgerEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockLedgerEntry" ADD CONSTRAINT "PartStockLedgerEntry_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockLedgerEntry" ADD CONSTRAINT "PartStockLedgerEntry_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockLedgerEntry" ADD CONSTRAINT "PartStockLedgerEntry_reversalOfEntryId_fkey" FOREIGN KEY ("reversalOfEntryId") REFERENCES "PartStockLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartStockLedgerEntry" ADD CONSTRAINT "PartStockLedgerEntry_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairPartDemand" ADD CONSTRAINT "RepairPartDemand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairPartDemand" ADD CONSTRAINT "RepairPartDemand_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairPartDemand" ADD CONSTRAINT "RepairPartDemand_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairPartDemand" ADD CONSTRAINT "RepairPartDemand_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartReservation" ADD CONSTRAINT "PartReservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartReservation" ADD CONSTRAINT "PartReservation_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "RepairPartDemand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartReservation" ADD CONSTRAINT "PartReservation_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartReservation" ADD CONSTRAINT "PartReservation_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "PartStockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartReservation" ADD CONSTRAINT "PartReservation_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairReadinessEvaluation" ADD CONSTRAINT "RepairReadinessEvaluation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepairReadinessEvaluation" ADD CONSTRAINT "RepairReadinessEvaluation_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_part_ledger_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'PartStockLedgerEntry is immutable'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "PartStockLedgerEntry_prevent_update" BEFORE UPDATE OR DELETE ON "PartStockLedgerEntry" FOR EACH ROW EXECUTE FUNCTION prevent_part_ledger_mutation();
CREATE FUNCTION prevent_readiness_evaluation_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'RepairReadinessEvaluation is immutable'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "RepairReadinessEvaluation_prevent_update" BEFORE UPDATE OR DELETE ON "RepairReadinessEvaluation" FOR EACH ROW EXECUTE FUNCTION prevent_readiness_evaluation_mutation();

INSERT INTO "VehicleOperationsFeatureFlag" ("id","organizationId","locationId","code","mode","rolloutPercent","allowedUserIds","version","updatedAt")
SELECT 'vo-flag-parts-' || "id", "id", NULL, 'PARTS_OPERATIONS', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP FROM "Organization" ON CONFLICT DO NOTHING;
