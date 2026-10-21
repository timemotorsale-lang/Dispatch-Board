CREATE TABLE "MoneyAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lastFour" TEXT,
    "assignedUserId" TEXT,
    "limitCents" INTEGER,
    "openingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MoneyEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "businessDate" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "accountId" TEXT,
    "parentId" TEXT,
    "vehicleId" TEXT,
    "inventoryUnitId" TEXT,
    "repairOrderId" TEXT,
    "vendorId" TEXT,
    "inventoryCostId" TEXT,
    "receiptDocumentId" TEXT,
    "receiptExplanation" TEXT,
    "reference" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MoneyCardCharge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "matchedEntryId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyCardCharge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MoneyAudit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MoneyDailyClose" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "expectedCents" INTEGER NOT NULL,
    "countedCents" INTEGER NOT NULL,
    "differenceCents" INTEGER NOT NULL,
    "unresolvedCount" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyDailyClose_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MoneyAccount_organizationId_assignedUserId_active_idx" ON "MoneyAccount"("organizationId", "assignedUserId", "active");

CREATE UNIQUE INDEX "MoneyEntry_inventoryCostId_key" ON "MoneyEntry"("inventoryCostId");

CREATE INDEX "MoneyEntry_organizationId_employeeId_businessDate_idx" ON "MoneyEntry"("organizationId", "employeeId", "businessDate");

CREATE INDEX "MoneyEntry_organizationId_accountId_businessDate_idx" ON "MoneyEntry"("organizationId", "accountId", "businessDate");

CREATE INDEX "MoneyEntry_organizationId_parentId_idx" ON "MoneyEntry"("organizationId", "parentId");

CREATE UNIQUE INDEX "MoneyCardCharge_matchedEntryId_key" ON "MoneyCardCharge"("matchedEntryId");

CREATE INDEX "MoneyCardCharge_organizationId_accountId_businessDate_idx" ON "MoneyCardCharge"("organizationId", "accountId", "businessDate");

CREATE UNIQUE INDEX "MoneyCardCharge_accountId_externalId_key" ON "MoneyCardCharge"("accountId", "externalId");

CREATE INDEX "MoneyAudit_organizationId_subjectId_createdAt_idx" ON "MoneyAudit"("organizationId", "subjectId", "createdAt");

CREATE UNIQUE INDEX "MoneyAudit_organizationId_idempotencyKey_key" ON "MoneyAudit"("organizationId", "idempotencyKey");

CREATE INDEX "MoneyDailyClose_organizationId_accountId_businessDate_idx" ON "MoneyDailyClose"("organizationId", "accountId", "businessDate");

ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MoneyEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_inventoryCostId_fkey" FOREIGN KEY ("inventoryCostId") REFERENCES "InventoryUnitCost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "DocumentLibraryDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyCardCharge" ADD CONSTRAINT "MoneyCardCharge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyCardCharge" ADD CONSTRAINT "MoneyCardCharge_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyCardCharge" ADD CONSTRAINT "MoneyCardCharge_matchedEntryId_fkey" FOREIGN KEY ("matchedEntryId") REFERENCES "MoneyEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyAudit" ADD CONSTRAINT "MoneyAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyAudit" ADD CONSTRAINT "MoneyAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyDailyClose" ADD CONSTRAINT "MoneyDailyClose_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyDailyClose" ADD CONSTRAINT "MoneyDailyClose_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_values_check" CHECK (
  kind IN ('CASH','CARD','BANK') AND "openingBalanceCents" >= 0 AND ("limitCents" IS NULL OR "limitCents" > 0)
  AND (kind <> 'CARD' OR ("assignedUserId" IS NOT NULL AND "lastFour" ~ '^[0-9]{4}$'))
);
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_values_check" CHECK (
  "amountCents" > 0 AND currency = 'USD' AND version > 0
  AND kind IN ('EXPENSE','FUNDS_REQUEST','ADVANCE_ISSUE','ADVANCE_RETURN','REFUND','REIMBURSEMENT','CARD_PAYMENT')
  AND "paymentMethod" IN ('CASH','CARD','BANK','PERSONAL')
  AND "approvalStatus" IN ('PENDING','APPROVED','REJECTED','SETTLED','SUPERSEDED')
  AND ("reviewedById" IS NULL OR "reviewedById" <> "employeeId")
  AND "businessDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
);
ALTER TABLE "MoneyCardCharge" ADD CONSTRAINT "MoneyCardCharge_amount_check" CHECK ("amountCents" <> 0 AND version > 0);
ALTER TABLE "MoneyDailyClose" ADD CONSTRAINT "MoneyDailyClose_count_check" CHECK ("countedCents" >= 0 AND "differenceCents" = "countedCents" - "expectedCents");

CREATE FUNCTION money_immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Money history is append-only. Record a documented correction.';
END;
$$;
CREATE TRIGGER "MoneyAudit_immutable" BEFORE UPDATE OR DELETE ON "MoneyAudit" FOR EACH ROW EXECUTE FUNCTION money_immutable_history();
CREATE TRIGGER "MoneyDailyClose_immutable" BEFORE UPDATE OR DELETE ON "MoneyDailyClose" FOR EACH ROW EXECUTE FUNCTION money_immutable_history();
CREATE TRIGGER "MoneyEntry_no_delete" BEFORE DELETE ON "MoneyEntry" FOR EACH ROW EXECUTE FUNCTION money_immutable_history();
CREATE TRIGGER "MoneyCardCharge_no_delete" BEFORE DELETE ON "MoneyCardCharge" FOR EACH ROW EXECUTE FUNCTION money_immutable_history();
CREATE TRIGGER "MoneyAccount_no_delete" BEFORE DELETE ON "MoneyAccount" FOR EACH ROW EXECUTE FUNCTION money_immutable_history();

CREATE FUNCTION money_entry_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."approvalStatus" = 'SUPERSEDED' THEN RAISE EXCEPTION 'Corrected money records are immutable history.'; END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW."organizationId",NEW."employeeId",NEW.kind,NEW."amountCents",NEW.currency,NEW."businessDate",NEW.merchant,NEW.purpose,NEW.category,NEW."paymentMethod",NEW."accountId",NEW."parentId",NEW."vehicleId",NEW."inventoryUnitId",NEW."repairOrderId",NEW."vendorId",NEW."inventoryCostId",NEW.reference,NEW."createdAt")
    IS DISTINCT FROM ROW(OLD."organizationId",OLD."employeeId",OLD.kind,OLD."amountCents",OLD.currency,OLD."businessDate",OLD.merchant,OLD.purpose,OLD.category,OLD."paymentMethod",OLD."accountId",OLD."parentId",OLD."vehicleId",OLD."inventoryUnitId",OLD."repairOrderId",OLD."vendorId",OLD."inventoryCostId",OLD.reference,OLD."createdAt") THEN
    RAISE EXCEPTION 'Original money facts cannot be overwritten.';
  END IF;
  IF NEW."accountId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "MoneyAccount" WHERE id=NEW."accountId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Money account scope mismatch.'; END IF;
  IF NEW."parentId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "MoneyEntry" WHERE id=NEW."parentId" AND "organizationId"=NEW."organizationId" AND "employeeId"=NEW."employeeId") THEN RAISE EXCEPTION 'Parent money scope mismatch.'; END IF;
  IF NEW."vehicleId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Vehicle" WHERE id=NEW."vehicleId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Vehicle scope mismatch.'; END IF;
  IF NEW."inventoryUnitId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "InventoryUnit" WHERE id=NEW."inventoryUnitId" AND "organizationId"=NEW."organizationId" AND "vehicleId"=NEW."vehicleId") THEN RAISE EXCEPTION 'Inventory scope mismatch.'; END IF;
  IF NEW."repairOrderId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "RepairOrder" WHERE id=NEW."repairOrderId" AND "organizationId"=NEW."organizationId" AND "vehicleId"=NEW."vehicleId") THEN RAISE EXCEPTION 'Repair order scope mismatch.'; END IF;
  IF NEW."vendorId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Vendor" WHERE id=NEW."vendorId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Vendor scope mismatch.'; END IF;
  IF NEW."inventoryCostId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "InventoryUnitCost" WHERE id=NEW."inventoryCostId" AND "organizationId"=NEW."organizationId" AND "inventoryUnitId"=NEW."inventoryUnitId" AND "amountCents"=NEW."amountCents") THEN RAISE EXCEPTION 'Cost scope or amount mismatch.'; END IF;
  IF NEW."receiptDocumentId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DocumentLibraryDocument" WHERE id=NEW."receiptDocumentId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Receipt scope mismatch.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "MoneyEntry_integrity" BEFORE INSERT OR UPDATE ON "MoneyEntry" FOR EACH ROW EXECUTE FUNCTION money_entry_integrity();

CREATE FUNCTION money_charge_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(NEW."organizationId",NEW."accountId",NEW."externalId",NEW."businessDate",NEW.merchant,NEW."amountCents") IS DISTINCT FROM ROW(OLD."organizationId",OLD."accountId",OLD."externalId",OLD."businessDate",OLD.merchant,OLD."amountCents") THEN RAISE EXCEPTION 'Statement facts cannot be overwritten.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "MoneyAccount" WHERE id=NEW."accountId" AND "organizationId"=NEW."organizationId" AND kind='CARD') THEN RAISE EXCEPTION 'Card account scope mismatch.'; END IF;
  IF NEW."matchedEntryId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "MoneyEntry" WHERE id=NEW."matchedEntryId" AND "organizationId"=NEW."organizationId" AND "accountId"=NEW."accountId" AND "amountCents" * CASE WHEN kind='EXPENSE' THEN 1 ELSE -1 END = NEW."amountCents" AND kind IN ('EXPENSE','REFUND','CARD_PAYMENT') AND "approvalStatus"='APPROVED') THEN RAISE EXCEPTION 'Statement match does not agree with the approved record.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "MoneyCardCharge_integrity" BEFORE INSERT OR UPDATE ON "MoneyCardCharge" FOR EACH ROW EXECUTE FUNCTION money_charge_integrity();

CREATE FUNCTION money_account_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(NEW."organizationId",NEW.kind,NEW."lastFour",NEW."assignedUserId",NEW."openingBalanceCents",NEW."limitCents",NEW.label) IS DISTINCT FROM ROW(OLD."organizationId",OLD.kind,OLD."lastFour",OLD."assignedUserId",OLD."openingBalanceCents",OLD."limitCents",OLD.label) THEN RAISE EXCEPTION 'Funding source history cannot be reassigned or rewritten. Deactivate and establish a new source.'; END IF;
  IF NEW."assignedUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "UserLocationAccess" access JOIN "Location" location ON location.id=access."locationId" WHERE access."userId"=NEW."assignedUserId" AND location."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Account employee scope mismatch.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "MoneyAccount_integrity" BEFORE INSERT OR UPDATE ON "MoneyAccount" FOR EACH ROW EXECUTE FUNCTION money_account_integrity();

CREATE FUNCTION money_close_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "MoneyAccount" WHERE id=NEW."accountId" AND "organizationId"=NEW."organizationId" AND kind='CASH') THEN RAISE EXCEPTION 'Cash review scope mismatch.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "MoneyDailyClose_integrity" BEFORE INSERT ON "MoneyDailyClose" FOR EACH ROW EXECUTE FUNCTION money_close_integrity();
