CREATE TABLE "InventoryIntakeRevision" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "inventoryUnitId" TEXT,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "status" TEXT NOT NULL CHECK ("status" IN ('DRAFT', 'CONFIRMED')),
  "details" JSONB NOT NULL,
  "pendingItems" JSONB NOT NULL,
  "costRecordIds" JSONB NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryIntakeRevision_vehicle_fkey" FOREIGN KEY ("vehicleId", "organizationId") REFERENCES "Vehicle"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryIntakeRevision_unit_fkey" FOREIGN KEY ("inventoryUnitId", "organizationId") REFERENCES "InventoryUnit"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryIntakeRevision_vehicle_version_key" ON "InventoryIntakeRevision"("vehicleId", "version");
CREATE INDEX "InventoryIntakeRevision_scope_idx" ON "InventoryIntakeRevision"("organizationId", "vehicleId", "version");
CREATE FUNCTION prevent_inventory_intake_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Inventory intake revisions are append-only';
END;
$$;
CREATE TRIGGER "InventoryIntakeRevision_append_only" BEFORE UPDATE OR DELETE ON "InventoryIntakeRevision"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_intake_revision_mutation();
