CREATE TABLE "MoneyPurchasingAuthorization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "employeeId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "vendorId" TEXT NOT NULL REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "accountId" TEXT NOT NULL REFERENCES "MoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "purposeScope" TEXT NOT NULL,
  "categories" TEXT[] NOT NULL,
  "perPurchaseLimitCents" INTEGER NOT NULL CHECK ("perPurchaseLimitCents" > 0),
  "requiresPriorApproval" BOOLEAN NOT NULL DEFAULT false,
  "startsOn" TEXT NOT NULL,
  "expiresOn" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  CHECK ("startsOn" <= "expiresOn" AND "startsOn" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND "expiresOn" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  CHECK (cardinality(categories) > 0 AND categories <@ ARRAY['Parts','Fuel','Repairs','Transport','Supplies','Fees','Other']::TEXT[]),
  CHECK (length(trim("purposeScope")) > 0 AND version > 0),
  CHECK (("revokedAt" IS NULL AND "revocationReason" IS NULL) OR ("revokedAt" IS NOT NULL AND length(trim("revocationReason")) > 0))
);
CREATE INDEX "MoneyPurchasingAuthorization_org_employee_dates_idx" ON "MoneyPurchasingAuthorization"("organizationId", "employeeId", "startsOn", "expiresOn");
CREATE TABLE "MoneyPurchaseApproval" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "authorizationId" TEXT NOT NULL REFERENCES "MoneyPurchasingAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "employeeId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "purpose" TEXT NOT NULL CHECK (length(trim(purpose)) > 0),
  "category" TEXT NOT NULL,
  "businessDate" TEXT NOT NULL CHECK ("businessDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  "createdByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reviewedByUserId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK ((status='PENDING' AND "reviewedByUserId" IS NULL AND "reviewedAt" IS NULL) OR (status<>'PENDING' AND "reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL AND length(trim("reviewNote")) > 0)),
  CHECK ("reviewedByUserId" IS NULL OR ("reviewedByUserId" <> "employeeId" AND "reviewedByUserId" <> "createdByUserId"))
);
CREATE INDEX "MoneyPurchaseApproval_org_employee_status_date_idx" ON "MoneyPurchaseApproval"("organizationId", "employeeId", "status", "businessDate");
ALTER TABLE "MoneyEntry" ADD COLUMN "purchasingAuthorizationId" TEXT REFERENCES "MoneyPurchasingAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoneyEntry" ADD COLUMN "purchaseApprovalId" TEXT REFERENCES "MoneyPurchaseApproval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoneyEntry" ADD COLUMN "purchasingSnapshot" JSONB;
CREATE UNIQUE INDEX "MoneyEntry_purchaseApprovalId_key" ON "MoneyEntry"("purchaseApprovalId");

CREATE FUNCTION money_purchasing_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'MoneyPurchasingAuthorization' THEN
    IF TG_OP='UPDATE' AND (OLD."revokedAt" IS NOT NULL OR ROW(NEW."organizationId",NEW."employeeId",NEW."vendorId",NEW."accountId",NEW."purposeScope",NEW.categories,NEW."perPurchaseLimitCents",NEW."requiresPriorApproval",NEW."startsOn",NEW."expiresOn",NEW."createdByUserId",NEW."createdAt") IS DISTINCT FROM ROW(OLD."organizationId",OLD."employeeId",OLD."vendorId",OLD."accountId",OLD."purposeScope",OLD.categories,OLD."perPurchaseLimitCents",OLD."requiresPriorApproval",OLD."startsOn",OLD."expiresOn",OLD."createdByUserId",OLD."createdAt")) THEN RAISE EXCEPTION 'Purchasing policy is immutable. Revoke and replace it.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM "MoneyAccount" WHERE id=NEW."accountId" AND "organizationId"=NEW."organizationId" AND kind='CARD') OR NOT EXISTS (SELECT 1 FROM "Vendor" WHERE id=NEW."vendorId" AND "organizationId"=NEW."organizationId") OR NOT EXISTS (SELECT 1 FROM "UserLocationAccess" access JOIN "Location" location ON location.id=access."locationId" WHERE access."userId"=NEW."employeeId" AND location."organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Purchasing authorization scope mismatch.'; END IF;
  ELSE
    IF TG_OP='UPDATE' AND (OLD.status<>'PENDING' OR ROW(NEW."organizationId",NEW."authorizationId",NEW."employeeId",NEW."amountCents",NEW.purpose,NEW.category,NEW."businessDate",NEW."createdByUserId",NEW."createdAt") IS DISTINCT FROM ROW(OLD."organizationId",OLD."authorizationId",OLD."employeeId",OLD."amountCents",OLD.purpose,OLD.category,OLD."businessDate",OLD."createdByUserId",OLD."createdAt")) THEN RAISE EXCEPTION 'Purchase approval facts cannot be rewritten.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM "MoneyPurchasingAuthorization" WHERE id=NEW."authorizationId" AND "organizationId"=NEW."organizationId" AND "employeeId"=NEW."employeeId") THEN RAISE EXCEPTION 'Purchase request scope mismatch.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "MoneyPurchasingAuthorization_integrity" BEFORE INSERT OR UPDATE ON "MoneyPurchasingAuthorization" FOR EACH ROW EXECUTE FUNCTION money_purchasing_integrity();
CREATE TRIGGER "MoneyPurchaseApproval_integrity" BEFORE INSERT OR UPDATE ON "MoneyPurchaseApproval" FOR EACH ROW EXECUTE FUNCTION money_purchasing_integrity();
CREATE TRIGGER "MoneyPurchasingAuthorization_no_delete" BEFORE DELETE ON "MoneyPurchasingAuthorization" FOR EACH ROW EXECUTE FUNCTION money_immutable_history();
CREATE TRIGGER "MoneyPurchaseApproval_no_delete" BEFORE DELETE ON "MoneyPurchaseApproval" FOR EACH ROW EXECUTE FUNCTION money_immutable_history();
CREATE FUNCTION money_entry_purchasing_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND ROW(NEW."purchasingAuthorizationId",NEW."purchaseApprovalId",NEW."purchasingSnapshot") IS DISTINCT FROM ROW(OLD."purchasingAuthorizationId",OLD."purchaseApprovalId",OLD."purchasingSnapshot") THEN RAISE EXCEPTION 'Purchasing evidence is immutable history.'; END IF;
  IF NEW."purchasingAuthorizationId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "MoneyPurchasingAuthorization" WHERE id=NEW."purchasingAuthorizationId" AND "organizationId"=NEW."organizationId" AND "employeeId"=NEW."employeeId" AND "accountId"=NEW."accountId" AND "vendorId"=NEW."vendorId") THEN RAISE EXCEPTION 'Purchase employee, vendor or card scope mismatch.'; END IF;
  IF NEW."purchaseApprovalId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "MoneyPurchaseApproval" WHERE id=NEW."purchaseApprovalId" AND "authorizationId"=NEW."purchasingAuthorizationId" AND "organizationId"=NEW."organizationId" AND "employeeId"=NEW."employeeId" AND "amountCents"=NEW."amountCents" AND purpose=NEW.purpose AND category=NEW.category AND "businessDate"=NEW."businessDate" AND status='APPROVED') THEN RAISE EXCEPTION 'Prior approval does not match purchase facts.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "MoneyEntry_purchasing_integrity" BEFORE INSERT OR UPDATE ON "MoneyEntry" FOR EACH ROW EXECUTE FUNCTION money_entry_purchasing_integrity();
