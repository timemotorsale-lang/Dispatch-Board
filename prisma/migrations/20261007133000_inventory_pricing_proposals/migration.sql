CREATE TABLE "InventoryPricingProposal" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "inventoryUnitId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "inventoryVersion" INTEGER NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "packCents" INTEGER NOT NULL DEFAULT 0,
  "packEnabled" BOOLEAN NOT NULL DEFAULT false,
  "includeEstimates" BOOLEAN NOT NULL DEFAULT false,
  "marginMode" TEXT NOT NULL DEFAULT 'OFF',
  "threshold" INTEGER,
  "comparisonSnapshot" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryPricingProposal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryPricingProposal_unit_fkey" FOREIGN KEY ("inventoryUnitId", "organizationId") REFERENCES "InventoryUnit"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryPricingProposal_values" CHECK (
    "inventoryVersion" > 0 AND "priceCents" > 0 AND "packCents" >= 0
    AND ("packEnabled" OR "packCents" = 0)
    AND (("marginMode" = 'OFF' AND "threshold" IS NULL)
      OR ("marginMode" = 'AMOUNT' AND "threshold" >= 0)
      OR ("marginMode" = 'PERCENT' AND "threshold" BETWEEN 0 AND 10000))
    AND ("marginMode" = 'OFF' OR "threshold" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "InventoryPricingProposal_inventoryUnitId_inventoryVersion_key" ON "InventoryPricingProposal"("inventoryUnitId", "inventoryVersion");
CREATE INDEX "InventoryPricingProposal_organizationId_inventoryUnitId_created_idx" ON "InventoryPricingProposal"("organizationId", "inventoryUnitId", "createdAt");
CREATE FUNCTION prevent_inventory_pricing_proposal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Inventory pricing proposals are append-only';
END;
$$;
CREATE TRIGGER "InventoryPricingProposal_append_only" BEFORE UPDATE OR DELETE ON "InventoryPricingProposal"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_pricing_proposal_mutation();
