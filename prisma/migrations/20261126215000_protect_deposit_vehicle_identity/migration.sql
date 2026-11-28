CREATE FUNCTION prevent_held_vehicle_merge() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_id text;
BEGIN
  IF NEW."mergedIntoVehicleId" IS NULL OR NEW."mergedIntoVehicleId" IS NOT DISTINCT FROM OLD."mergedIntoVehicleId" THEN
    RETURN NEW;
  END IF;
  FOR target_id IN SELECT DISTINCT id FROM unnest(ARRAY[NEW."id", NEW."mergedIntoVehicleId"]) AS vehicles(id) ORDER BY id LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW."organizationId" || ':' || target_id, 0));
  END LOOP;
  IF EXISTS (SELECT 1 FROM "CustomerSalesDeposit" d WHERE d."organizationId" = NEW."organizationId"
    AND d."vehicleId" IN (NEW."id", NEW."mergedIntoVehicleId") AND d."refundedAt" IS NULL) THEN
    RAISE EXCEPTION 'A vehicle in this merge has a customer deposit hold. Record a verified full refund in Customer 360 before merging.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deposit_guard_vehicle_merge BEFORE UPDATE OF "mergedIntoVehicleId" ON "Vehicle"
  FOR EACH ROW EXECUTE FUNCTION prevent_held_vehicle_merge();
