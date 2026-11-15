CREATE TABLE "ServiceRepairDepositEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "repairOrderId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "relatedEntryId" TEXT,
  "invoiceId" TEXT,
  "invoiceEntryId" TEXT,
  "evidence" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceRepairDepositEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceRepairDepositEntry_amount_check" CHECK ("amountCents" > 0),
  CONSTRAINT "ServiceRepairDepositEntry_kind_check" CHECK ("kind" IN ('COLLECTION','REFUND','APPLY','UNAPPLY')),
  CONSTRAINT "ServiceRepairDepositEntry_method_check" CHECK ("method" IN ('CASH','CHECK','EXTERNAL_CARD','BANK_TRANSFER','OTHER')),
  CONSTRAINT "ServiceRepairDepositEntry_links_check" CHECK (
    ("kind" = 'COLLECTION' AND "relatedEntryId" IS NULL AND "invoiceId" IS NULL AND "invoiceEntryId" IS NULL) OR
    ("kind" = 'REFUND' AND "relatedEntryId" IS NOT NULL AND "invoiceId" IS NULL AND "invoiceEntryId" IS NULL) OR
    ("kind" IN ('APPLY','UNAPPLY') AND "relatedEntryId" IS NOT NULL AND "invoiceId" IS NOT NULL AND "invoiceEntryId" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "ServiceRepairDepositEntry_invoiceEntryId_key" ON "ServiceRepairDepositEntry"("invoiceEntryId");
CREATE UNIQUE INDEX "ServiceRepairDepositEntry_org_ro_kind_reference_key" ON "ServiceRepairDepositEntry"("organizationId","repairOrderId","kind","reference");
CREATE INDEX "ServiceRepairDepositEntry_org_ro_createdAt_idx" ON "ServiceRepairDepositEntry"("organizationId","repairOrderId","createdAt");
CREATE INDEX "ServiceRepairDepositEntry_relatedEntryId_idx" ON "ServiceRepairDepositEntry"("relatedEntryId");
ALTER TABLE "ServiceRepairDepositEntry" ADD CONSTRAINT "ServiceRepairDepositEntry_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRepairDepositEntry" ADD CONSTRAINT "ServiceRepairDepositEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ServiceInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRepairDepositEntry" ADD CONSTRAINT "ServiceRepairDepositEntry_invoiceEntryId_fkey" FOREIGN KEY ("invoiceEntryId") REFERENCES "ServiceInvoiceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRepairDepositEntry" ADD CONSTRAINT "ServiceRepairDepositEntry_relatedEntryId_fkey" FOREIGN KEY ("relatedEntryId") REFERENCES "ServiceRepairDepositEntry"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Existing invoice and RO tables use globally unique IDs, not composite tenant
-- keys. Enforce tenant/RO linkage and immutable financial history at the database.
CREATE FUNCTION enforce_service_repair_deposit_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Deposit history is immutable; append a reversal instead'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "RepairOrder" r WHERE r.id = NEW."repairOrderId" AND r."organizationId" = NEW."organizationId") THEN
    RAISE EXCEPTION 'Deposit repair order does not belong to this organization';
  END IF;
  IF NEW."relatedEntryId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ServiceRepairDepositEntry" d WHERE d.id = NEW."relatedEntryId" AND d."organizationId" = NEW."organizationId" AND d."repairOrderId" = NEW."repairOrderId" AND d.kind = CASE WHEN NEW.kind = 'UNAPPLY' THEN 'APPLY' ELSE 'COLLECTION' END) THEN
    RAISE EXCEPTION 'Deposit source does not belong to this repair order or event type';
  END IF;
  IF NEW."invoiceId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ServiceInvoice" i JOIN "ServiceInvoiceEntry" e ON e."invoiceId" = i.id AND e."organizationId" = i."organizationId" WHERE i.id = NEW."invoiceId" AND i."organizationId" = NEW."organizationId" AND i."repairOrderId" = NEW."repairOrderId" AND e.id = NEW."invoiceEntryId" AND e."amountCents" = NEW."amountCents" AND e.kind = CASE WHEN NEW.kind = 'APPLY' THEN 'PAYMENT' ELSE 'REFUND' END) THEN
    RAISE EXCEPTION 'Deposit transfer does not match its invoice ledger entry';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ServiceRepairDepositEntry_history_guard" BEFORE INSERT OR UPDATE OR DELETE ON "ServiceRepairDepositEntry" FOR EACH ROW EXECUTE FUNCTION enforce_service_repair_deposit_history();
