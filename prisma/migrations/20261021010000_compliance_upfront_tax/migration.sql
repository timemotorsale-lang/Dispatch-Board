CREATE TABLE "ComplianceTaxRecord" (
 "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "reference" TEXT NOT NULL,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('LEASE', 'SALE')), "month" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'VOID')),
 "version" INTEGER NOT NULL DEFAULT 1, "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ComplianceTaxRecord_organizationId_reference_kind_key" ON "ComplianceTaxRecord"("organizationId", "reference", "kind");
CREATE INDEX "ComplianceTaxRecord_organizationId_month_idx" ON "ComplianceTaxRecord"("organizationId", "month");
CREATE TABLE "ComplianceTaxPeriod" (
 "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "month" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'FILED', 'PAID')), "snapshot" JSONB,
 "filingReference" TEXT, "filedAt" TEXT, "paymentReference" TEXT, "paidAt" TEXT,
 "paidCents" INTEGER, "version" INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX "ComplianceTaxPeriod_organizationId_month_key" ON "ComplianceTaxPeriod"("organizationId", "month");
CREATE TABLE "ComplianceTaxAudit" (
 "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "month" TEXT NOT NULL, "recordId" TEXT, "action" TEXT NOT NULL, "details" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ComplianceTaxAudit_organizationId_month_createdAt_idx" ON "ComplianceTaxAudit"("organizationId", "month", "createdAt");
ALTER TABLE "ComplianceTaxRecord" ADD CONSTRAINT "ComplianceTaxRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceTaxPeriod" ADD CONSTRAINT "ComplianceTaxPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceTaxAudit" ADD CONSTRAINT "ComplianceTaxAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION compliance_tax_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Compliance tax history is append-only';
END $$;
CREATE TRIGGER compliance_tax_audit_immutable BEFORE UPDATE OR DELETE ON "ComplianceTaxAudit" FOR EACH ROW EXECUTE FUNCTION compliance_tax_history_guard();

CREATE FUNCTION compliance_tax_record_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_org TEXT; target_month TEXT;
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Void tax records instead of deleting history'; END IF;
 target_org := NEW."organizationId"; target_month := NEW."month";
 PERFORM pg_advisory_xact_lock(hashtextextended('compliance:' || target_org, 0));
 IF TG_OP = 'UPDATE' THEN
  IF OLD."organizationId" <> target_org OR OLD."month" <> target_month OR OLD."createdBy" <> NEW."createdBy" OR OLD."createdAt" <> NEW."createdAt" OR OLD."status" = 'VOID' THEN
   RAISE EXCEPTION 'Tax record identity and voided history cannot be rewritten';
  END IF;
 END IF;
 IF EXISTS (SELECT 1 FROM "ComplianceTaxPeriod" WHERE "organizationId" = target_org AND "month" = target_month AND "status" <> 'DRAFT') THEN
  RAISE EXCEPTION 'Filed tax records are locked';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER compliance_tax_record_locked BEFORE INSERT OR UPDATE OR DELETE ON "ComplianceTaxRecord" FOR EACH ROW EXECUTE FUNCTION compliance_tax_record_guard();

CREATE FUNCTION compliance_tax_period_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Tax filing history cannot be deleted'; END IF;
 IF OLD."organizationId" <> NEW."organizationId" OR OLD."month" <> NEW."month" THEN RAISE EXCEPTION 'Tax period identity cannot be changed'; END IF;
 IF OLD."status" = 'PAID' OR (OLD."status" = 'FILED' AND (NEW."status" <> 'PAID' OR NEW."snapshot" IS DISTINCT FROM OLD."snapshot" OR NEW."filingReference" IS DISTINCT FROM OLD."filingReference" OR NEW."filedAt" IS DISTINCT FROM OLD."filedAt")) THEN
  RAISE EXCEPTION 'Filed tax worksheet and evidence cannot be rewritten';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER compliance_tax_period_locked BEFORE UPDATE OR DELETE ON "ComplianceTaxPeriod" FOR EACH ROW EXECUTE FUNCTION compliance_tax_period_guard();
