CREATE TABLE "ServiceDocument" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "repairOrderId" TEXT NOT NULL REFERENCES "RepairOrder"("id"), "kind" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL, "sourceVersion" INTEGER NOT NULL CHECK ("sourceVersion" > 0),
  "templateVersion" TEXT NOT NULL, "content" JSONB NOT NULL, "sha256" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL REFERENCES "User"("id"), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ServiceDocument_organizationId_kind_sourceId_sourceVersion_key" ON "ServiceDocument"("organizationId", "kind", "sourceId", "sourceVersion");
CREATE INDEX "ServiceDocument_organizationId_repairOrderId_createdAt_idx" ON "ServiceDocument"("organizationId", "repairOrderId", "createdAt");
CREATE TABLE "ServiceInvoice" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "repairOrderId" TEXT NOT NULL REFERENCES "RepairOrder"("id"), "packageId" TEXT NOT NULL REFERENCES "ServiceInvoicePackage"("id"),
  "invoiceNumber" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'POSTED' CHECK ("status" IN ('POSTED','VOID')),
  "currency" TEXT NOT NULL DEFAULT 'USD' CHECK ("currency" = 'USD'), "subtotalCents" INTEGER NOT NULL CHECK ("subtotalCents" >= 0),
  "discountCents" INTEGER NOT NULL CHECK ("discountCents" >= 0), "taxCents" INTEGER NOT NULL CHECK ("taxCents" >= 0),
  "totalCents" INTEGER NOT NULL CHECK ("totalCents" = "subtotalCents" - "discountCents" + "taxCents" AND "totalCents" >= 0),
  "ledger" JSONB NOT NULL, "sourceFingerprint" TEXT NOT NULL, "issuedAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL REFERENCES "User"("id"), "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ServiceInvoice_packageId_key" ON "ServiceInvoice"("packageId");
CREATE UNIQUE INDEX "ServiceInvoice_organizationId_invoiceNumber_key" ON "ServiceInvoice"("organizationId", "invoiceNumber");
CREATE UNIQUE INDEX "ServiceInvoice_active_order_key" ON "ServiceInvoice"("organizationId", "repairOrderId") WHERE "status" = 'POSTED';
CREATE INDEX "ServiceInvoice_organizationId_repairOrderId_issuedAt_idx" ON "ServiceInvoice"("organizationId", "repairOrderId", "issuedAt");
CREATE TABLE "ServiceInvoiceEntry" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "invoiceId" TEXT NOT NULL REFERENCES "ServiceInvoice"("id"), "kind" TEXT NOT NULL CHECK ("kind" IN ('PAYMENT','REFUND','CREDIT','VOID')),
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" >= 0), "method" TEXT, "reference" TEXT NOT NULL,
  "relatedEntryId" TEXT REFERENCES "ServiceInvoiceEntry"("id"), "evidence" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL, "createdByUserId" TEXT NOT NULL REFERENCES "User"("id"),
  "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ServiceInvoiceEntry_organizationId_invoiceId_kind_reference_key" ON "ServiceInvoiceEntry"("organizationId", "invoiceId", "kind", "reference");
CREATE INDEX "ServiceInvoiceEntry_organizationId_invoiceId_occurredAt_idx" ON "ServiceInvoiceEntry"("organizationId", "invoiceId", "occurredAt");
CREATE TABLE "ServiceInvoiceSequence" ("organizationId" TEXT NOT NULL PRIMARY KEY REFERENCES "Organization"("id"), "nextNumber" INTEGER NOT NULL CHECK ("nextNumber" > 0));
CREATE FUNCTION "protect_service_document_ledger"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Service documents and invoice entries are append-only; record an attributable adjustment';
END;
$$;
CREATE TRIGGER "ServiceDocument_immutable" BEFORE UPDATE OR DELETE ON "ServiceDocument" FOR EACH ROW EXECUTE FUNCTION "protect_service_document_ledger"();
CREATE TRIGGER "ServiceInvoiceEntry_immutable" BEFORE UPDATE OR DELETE ON "ServiceInvoiceEntry" FOR EACH ROW EXECUTE FUNCTION "protect_service_document_ledger"();
CREATE FUNCTION "protect_posted_service_invoice"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Posted invoices cannot be deleted'; END IF;
  IF (to_jsonb(NEW) - 'status' - 'version') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'version') THEN
    RAISE EXCEPTION 'Posted invoice content is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ServiceInvoice_immutable_content" BEFORE UPDATE OR DELETE ON "ServiceInvoice" FOR EACH ROW EXECUTE FUNCTION "protect_posted_service_invoice"();
