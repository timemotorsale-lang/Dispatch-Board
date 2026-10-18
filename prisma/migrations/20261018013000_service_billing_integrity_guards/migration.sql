CREATE FUNCTION "check_service_record_scope"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'ServiceDocument' OR TG_TABLE_NAME = 'ServiceInvoice' THEN
    IF NOT EXISTS (SELECT 1 FROM "RepairOrder" WHERE "id" = NEW."repairOrderId" AND "organizationId" = NEW."organizationId") THEN
      RAISE EXCEPTION 'Service record organization must match its repair order';
    END IF;
    IF TG_TABLE_NAME = 'ServiceInvoice' THEN
      IF NOT EXISTS (SELECT 1 FROM "ServiceInvoicePackage" WHERE "id" = NEW."packageId" AND "organizationId" = NEW."organizationId" AND "repairOrderId" = NEW."repairOrderId") THEN
        RAISE EXCEPTION 'Invoice package must match the same organization and repair order';
      END IF;
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM "ServiceInvoice" WHERE "id" = NEW."invoiceId" AND "organizationId" = NEW."organizationId" AND "status" = 'POSTED') THEN
      RAISE EXCEPTION 'Financial entry requires the same organization and a posted invoice';
    END IF;
    IF NEW."kind" = 'REFUND' AND NOT EXISTS (SELECT 1 FROM "ServiceInvoiceEntry" WHERE "id" = NEW."relatedEntryId" AND "invoiceId" = NEW."invoiceId" AND "organizationId" = NEW."organizationId" AND "kind" = 'PAYMENT') THEN
      RAISE EXCEPTION 'Refund must reference a payment on the same invoice';
    END IF;
    IF (NEW."kind" = 'VOID' AND NEW."amountCents" <> 0) OR (NEW."kind" <> 'VOID' AND NEW."amountCents" <= 0) THEN
      RAISE EXCEPTION 'Invalid financial entry amount';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ServiceDocument_scope" BEFORE INSERT ON "ServiceDocument" FOR EACH ROW EXECUTE FUNCTION "check_service_record_scope"();
CREATE TRIGGER "ServiceInvoice_scope" BEFORE INSERT ON "ServiceInvoice" FOR EACH ROW EXECUTE FUNCTION "check_service_record_scope"();
CREATE TRIGGER "ServiceInvoiceEntry_scope" BEFORE INSERT ON "ServiceInvoiceEntry" FOR EACH ROW EXECUTE FUNCTION "check_service_record_scope"();
CREATE FUNCTION "check_service_invoice_transition"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'VOID' OR NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'Invoice transitions must be monotonic and void is terminal';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ServiceInvoice_transition" BEFORE UPDATE ON "ServiceInvoice" FOR EACH ROW EXECUTE FUNCTION "check_service_invoice_transition"();
CREATE FUNCTION "guard_native_invoice_repair_close"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  invoice_record RECORD;
  paid BIGINT;
  credited BIGINT;
BEGIN
  IF OLD."closedAt" IS NULL AND NEW."closedAt" IS NOT NULL THEN
    SELECT * INTO invoice_record FROM "ServiceInvoice" WHERE "repairOrderId" = NEW."id" AND "organizationId" = NEW."organizationId" AND "status" = 'POSTED';
    IF FOUND THEN
      IF NEW."stage"::text <> 'CLOSED' THEN RAISE EXCEPTION 'Posted invoices require financial closeout, not duplicate or no-work cancellation'; END IF;
      SELECT COALESCE(SUM(CASE WHEN "kind" = 'PAYMENT' THEN "amountCents" WHEN "kind" = 'REFUND' THEN -"amountCents" ELSE 0 END), 0), COALESCE(SUM(CASE WHEN "kind" = 'CREDIT' THEN "amountCents" ELSE 0 END), 0)
      INTO paid, credited FROM "ServiceInvoiceEntry" WHERE "invoiceId" = invoice_record."id" AND "organizationId" = NEW."organizationId";
      IF invoice_record."totalCents" - credited - paid <> 0 THEN RAISE EXCEPTION 'Native invoice must be settled before repair order close'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "RepairOrder_native_invoice_close" BEFORE UPDATE ON "RepairOrder" FOR EACH ROW EXECUTE FUNCTION "guard_native_invoice_repair_close"();
