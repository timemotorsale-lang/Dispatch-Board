ALTER TABLE "CustomerSalesDeposit" ADD COLUMN "kind" text NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "CustomerSalesDeposit" ADD CONSTRAINT customer_sales_deposit_kind CHECK ("kind" IN ('GENERAL','RESERVATION','ORDER'));
CREATE UNIQUE INDEX one_active_reservation_per_vin ON "CustomerSalesDeposit" ("organizationId", upper(btrim("vin")))
  WHERE "kind" = 'RESERVATION' AND "vin" IS NOT NULL AND "refundedAt" IS NULL;

CREATE FUNCTION lock_customer_deposit_vin(org text, vin text) RETURNS void LANGUAGE sql AS $$
  SELECT pg_advisory_xact_lock(hashtextextended(org || ':deposit-vin:' || upper(btrim(vin)), 0))
$$;

CREATE FUNCTION assert_customer_deposit_vin_hold(org text, target_vin text, buyer text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF target_vin IS NULL OR upper(btrim(target_vin)) !~ '^[A-HJ-NPR-Z0-9]{17}$' THEN RETURN; END IF;
  PERFORM lock_customer_deposit_vin(org, target_vin);
  IF EXISTS (SELECT 1 FROM "CustomerSalesDeposit" d WHERE d."organizationId" = org AND upper(btrim(d."vin")) = upper(btrim(target_vin))
    AND d."kind" = 'RESERVATION' AND d."refundedAt" IS NULL AND d."customerId" IS DISTINCT FROM buyer) THEN
    RAISE EXCEPTION 'Vehicle is held by a customer deposit. Use the deposit customer on the sale or record a verified full refund in Customer 360.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assert_customer_deposit_hold(target_org text, target_vehicle text, buyer text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE vehicle_vin text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_org || ':' || target_vehicle, 0));
  SELECT v."vin" INTO vehicle_vin FROM "Vehicle" v WHERE v."organizationId" = target_org AND v."id" = target_vehicle;
  PERFORM assert_customer_deposit_vin_hold(target_org, vehicle_vin, buyer);
  IF EXISTS (SELECT 1 FROM "CustomerSalesDeposit" d WHERE d."organizationId" = target_org
    AND d."vehicleId" = target_vehicle AND d."refundedAt" IS NULL AND d."customerId" IS DISTINCT FROM buyer) THEN
    RAISE EXCEPTION 'Vehicle is held by a customer deposit. Use the deposit customer on the sale or record a verified full refund in Customer 360.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- Check exact VINs even if the sales record has no canonical inventory match yet.
-- For a held VIN, only the existing canonical sale guard is allowed to identify the buyer.
CREATE FUNCTION guard_unlinked_customer_deposit_vin() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  org text := CASE WHEN NEW."organizationId" = 'default-org' THEN 'org-time-motor-sales' ELSE NEW."organizationId" END;
  raw_vin text;
  candidate_vins text[];
  vehicle_key text;
  buyer text;
BEGIN
  IF TG_TABLE_NAME = 'DealDeskDraft' THEN
    IF NEW."status" <> 'SOLD' OR NOT vehicle_commercial_pathway(NEW."pathway") THEN RETURN NEW; END IF;
    vehicle_key := COALESCE(NEW."snapshot" ->> 'desk:soldVehicleId',
      (SELECT "vehicleId" FROM "DealWorkflowContext" WHERE "draftId" = NEW."id"), NEW."snapshot" #>> '{desk:identity,vehicleId}');
    candidate_vins := ARRAY[NEW."snapshot" -> (NEW."pathway" || ':vehicleFacts') ->> 'vin', NEW."vehicleReference"];
  ELSE
    IF NEW."state" NOT IN ('CLOSED','DELIVERED_FUNDING_PENDING') OR NOT vehicle_commercial_pathway(NEW."pathway") THEN RETURN NEW; END IF;
    candidate_vins := ARRAY[NEW."vin", NEW."vehicleReference"];
  END IF;
  FOR raw_vin IN SELECT DISTINCT upper(btrim(x)) FROM unnest(candidate_vins) x WHERE upper(btrim(x)) ~ '^[A-HJ-NPR-Z0-9]{17}$' ORDER BY 1 LOOP
    SELECT c."id" INTO buyer FROM "Customer" c WHERE c."organizationId" = org AND c."id" = NEW."customerId"
      AND lower(btrim(c."displayName")) = lower(btrim(NEW."customerName"))
      AND EXISTS (SELECT 1 FROM "Vehicle" v WHERE v."organizationId" = org AND v."mergedIntoVehicleId" IS NULL
        AND upper(btrim(v."vin")) = raw_vin);
    PERFORM assert_customer_deposit_vin_hold(org, raw_vin, buyer);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deposit_vin_guard_deal BEFORE INSERT OR UPDATE OF "status","pathway","snapshot","customerId","vehicleReference" ON "DealDeskDraft"
  FOR EACH ROW EXECUTE FUNCTION guard_unlinked_customer_deposit_vin();
CREATE TRIGGER deposit_vin_guard_packet BEFORE INSERT OR UPDATE OF "state","customerId","vin","stockNumber","vehicleReference" ON "SalesDocumentJacket"
  FOR EACH ROW EXECUTE FUNCTION guard_unlinked_customer_deposit_vin();

CREATE FUNCTION guard_customer_deposit_vin_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE destination_vin text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" = 'SOLD' THEN PERFORM assert_customer_deposit_vin_hold(NEW."organizationId", NEW."vin", NULL); END IF;
    RETURN NEW;
  END IF;
  IF (upper(btrim(NEW."vin")) IS DISTINCT FROM upper(btrim(OLD."vin"))
      OR NEW."mergedIntoVehicleId" IS DISTINCT FROM OLD."mergedIntoVehicleId") AND OLD."vin" IS NOT NULL THEN
    PERFORM assert_customer_deposit_hold(OLD."organizationId", OLD."id", NULL);
  END IF;
  IF upper(btrim(NEW."vin")) IS DISTINCT FROM upper(btrim(OLD."vin")) AND NEW."status" = 'SOLD' THEN
    PERFORM assert_customer_deposit_vin_hold(NEW."organizationId", NEW."vin", NULL);
  END IF;
  IF NEW."mergedIntoVehicleId" IS NOT NULL AND NEW."mergedIntoVehicleId" IS DISTINCT FROM OLD."mergedIntoVehicleId" THEN
    SELECT v."vin" INTO destination_vin FROM "Vehicle" v WHERE v."organizationId" = NEW."organizationId" AND v."id" = NEW."mergedIntoVehicleId";
    PERFORM assert_customer_deposit_vin_hold(NEW."organizationId", destination_vin, NULL);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deposit_vin_guard_identity BEFORE INSERT OR UPDATE OF "vin","mergedIntoVehicleId" ON "Vehicle"
  FOR EACH ROW EXECUTE FUNCTION guard_customer_deposit_vin_identity();
