CREATE FUNCTION vehicle_commercial_pathway(pathway text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT pathway IN ('retail-sale', 'outside-finance-one-pay', 'finance', 'bhph', 'wholesale', 'lease-to-own');
$$;

CREATE FUNCTION vehicle_return_review_pending(booking "VehicleUseBooking") RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT booking."status" = 'RETURNED_REVIEW' OR (booking."status" = 'RETURNED' AND EXISTS (
    SELECT 1 FROM "SalesDocumentJacket" jacket
    WHERE jacket."id" = booking."agreementJacketId" AND jacket."pathway" IN ('daily-rental', 'vehicle-loaner')
      AND NOT EXISTS (SELECT 1 FROM "DealContinuityEvent" event WHERE event."bookingId" = booking."id" AND event."action" = 'COMPLETE')
  ));
$$;

CREATE FUNCTION assert_vehicle_use_clear(target_org text, target_vehicle text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_org || ':' || target_vehicle, 0));
  IF EXISTS (SELECT 1 FROM "VehicleUseBooking" b WHERE b."organizationId" = target_org AND b."vehicleId" = target_vehicle AND b."status" IN ('RETURNED', 'RETURNED_REVIEW') AND vehicle_return_review_pending(b)) THEN
    RAISE EXCEPTION 'Complete the vehicle return review before reserving, selling, or delivering this vehicle.' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM "VehicleUseBooking" WHERE "organizationId" = target_org AND "vehicleId" = target_vehicle AND "status" = 'CHECKED_OUT') THEN
    RAISE EXCEPTION 'Record the actual vehicle return and resolve any return hold before reserving, selling, or delivering this vehicle.' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM "VehicleUseBooking" WHERE "organizationId" = target_org AND "vehicleId" = target_vehicle AND "status" = 'RESERVED' AND "expectedReturnAt" > (clock_timestamp() AT TIME ZONE 'UTC')) THEN
    RAISE EXCEPTION 'Cancel or resolve the temporary vehicle reservation before reserving, selling, or delivering this vehicle.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE INDEX vehicle_use_completion_evidence ON "DealContinuityEvent" ("bookingId") WHERE "action" = 'COMPLETE';

CREATE FUNCTION vehicle_commercial_reference_matches(vehicle "Vehicle", exact_reference text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT NULLIF(btrim(exact_reference), '') IS NOT NULL AND (
    upper(btrim(exact_reference)) IN (upper(btrim(vehicle."stockNumber")), upper(btrim(vehicle."vehicleNumber")))
    OR (vehicle."vin" ~ '^[A-HJ-NPR-Z0-9]{17}$' AND vehicle."vin" = upper(btrim(exact_reference)))
    OR EXISTS (
      SELECT 1 FROM "InventoryUnit" unit
      WHERE unit."organizationId" = vehicle."organizationId" AND unit."vehicleId" = vehicle."id" AND unit."closedAt" IS NULL
        AND upper(btrim(unit."inventoryNumber")) = upper(btrim(exact_reference))
    )
  );
$$;

CREATE FUNCTION vehicle_commercial_match(commercial_org text, linked_id text, exact_vin text, exact_references text[])
RETURNS TABLE (organization_id text, vehicle_id text) LANGUAGE sql STABLE AS $$
  SELECT v."organizationId", v."id"
  FROM "Vehicle" v
  WHERE v."organizationId" = CASE WHEN commercial_org = 'default-org' THEN 'org-time-motor-sales' ELSE commercial_org END
    AND v."mergedIntoVehicleId" IS NULL
    AND (v."id" = linked_id OR (exact_vin ~ '^[A-HJ-NPR-Z0-9]{17}$' AND v."vin" = exact_vin)
      OR EXISTS (SELECT 1 FROM unnest(exact_references) AS candidate_ref(reference) WHERE vehicle_commercial_reference_matches(v, reference)));
$$;

CREATE FUNCTION guard_commercial_vehicle_custody() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  candidate record;
  matched_vehicle text;
  matched_count integer := 0;
BEGIN
  IF TG_TABLE_NAME = 'InventoryUnit' THEN
    IF NEW."lifecycleStage" IN ('RESERVED_DEAL_PENDING', 'SOLD', 'DELIVERED', 'WHOLESALED_OR_OTHER_DISPOSITION') THEN
      IF TG_OP = 'INSERT' OR OLD."lifecycleStage" IS DISTINCT FROM NEW."lifecycleStage" THEN
        PERFORM assert_vehicle_use_clear(NEW."organizationId", NEW."vehicleId");
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'Vehicle' THEN
    IF NEW."status" = 'SOLD' AND OLD."status" IS DISTINCT FROM NEW."status" THEN
      PERFORM assert_vehicle_use_clear(NEW."organizationId", NEW."id");
    END IF;
  ELSIF TG_TABLE_NAME = 'InventoryRetailCompletion' THEN
    IF NEW."stage" = 'RESERVED_DEAL_PENDING' AND OLD."reservationSnapshot" IS DISTINCT FROM NEW."reservationSnapshot" THEN
      FOR candidate IN SELECT "vehicleId" FROM "InventoryUnit" WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."inventoryUnitId" LOOP
        PERFORM assert_vehicle_use_clear(NEW."organizationId", candidate."vehicleId");
      END LOOP;
    END IF;
  ELSIF TG_TABLE_NAME = 'VehicleCommercialHandoff' THEN
    IF NEW."handoffType" = 'DELIVERY' AND NEW."status" IN ('COMPLETED', 'RECONCILED') AND OLD."status" IS DISTINCT FROM NEW."status" THEN
      PERFORM assert_vehicle_use_clear(NEW."organizationId", NEW."vehicleId");
    END IF;
  ELSIF TG_TABLE_NAME = 'DealDeskDraft' THEN
    IF NEW."status" <> 'SOLD' THEN
      IF TG_OP = 'UPDATE' AND OLD."status" IN ('SOLD', 'PENDING') AND OLD."snapshot" ? 'desk:soldVehicleId' THEN
        NEW."snapshot" := jsonb_set(NEW."snapshot", '{desk:soldVehicleId}', OLD."snapshot" -> 'desk:soldVehicleId');
      ELSE
        NEW."snapshot" := NEW."snapshot" - 'desk:soldVehicleId';
      END IF;
    END IF;
    IF vehicle_commercial_pathway(NEW."pathway") AND NEW."status" = 'SOLD' THEN
      IF TG_OP = 'UPDATE' AND (OLD."status", OLD."pathway", OLD."snapshot") IS NOT DISTINCT FROM (NEW."status", NEW."pathway", NEW."snapshot") THEN
        RETURN NEW;
      END IF;
      IF TG_OP = 'UPDATE' AND OLD."status" = 'SOLD' AND OLD."pathway" = NEW."pathway" AND OLD."snapshot" ? 'desk:soldVehicleId' THEN
        NEW."snapshot" := jsonb_set(NEW."snapshot", '{desk:soldVehicleId}', OLD."snapshot" -> 'desk:soldVehicleId');
      ELSE
        NEW."snapshot" := NEW."snapshot" - 'desk:soldVehicleId';
      END IF;
      FOR candidate IN SELECT DISTINCT matches.*
        FROM (SELECT COALESCE((SELECT "vehicleId" FROM "DealWorkflowContext" WHERE "draftId" = NEW."id"), NEW."snapshot" #>> '{desk:identity,vehicleId}') AS linked_id,
                     upper(COALESCE(NULLIF(btrim(NEW."snapshot" -> (NEW."pathway" || ':vehicleFacts') ->> 'vin'), ''), btrim(NEW."vehicleReference"))) AS vin,
                     ARRAY[NEW."snapshot" -> (NEW."pathway" || ':vehicleFacts') ->> 'stockNumber', NEW."vehicleReference"] AS stock_references) identity
        CROSS JOIN LATERAL vehicle_commercial_match(NEW."organizationId", COALESCE(NEW."snapshot" ->> 'desk:soldVehicleId', identity.linked_id), identity.vin, identity.stock_references) matches
        ORDER BY vehicle_id LOOP
        PERFORM assert_vehicle_use_clear(candidate.organization_id, candidate.vehicle_id);
        matched_vehicle := candidate.vehicle_id;
        matched_count := matched_count + 1;
      END LOOP;
      IF matched_count > 1 OR (matched_count = 0 AND (TG_OP = 'INSERT' OR OLD."status" <> 'SOLD')) THEN
        RAISE EXCEPTION 'Link one canonical vehicle before marking this deal sold.' USING ERRCODE = 'check_violation';
      END IF;
      IF matched_count = 1 THEN NEW."snapshot" := jsonb_set(NEW."snapshot", '{desk:soldVehicleId}', to_jsonb(matched_vehicle)); END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'SalesDocumentJacket' THEN
    IF vehicle_commercial_pathway(NEW."pathway") AND NEW."state" IN ('CLOSED', 'DELIVERED_FUNDING_PENDING') AND OLD."state" IS DISTINCT FROM NEW."state" THEN
      FOR candidate IN SELECT * FROM vehicle_commercial_match(NEW."organizationId", NULL, upper(btrim(NEW."vin")), ARRAY[NEW."stockNumber", NEW."vehicleReference"]) ORDER BY vehicle_id LOOP
        PERFORM assert_vehicle_use_clear(candidate.organization_id, candidate.vehicle_id);
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER commercial_inventory_custody BEFORE INSERT OR UPDATE OF "lifecycleStage" ON "InventoryUnit" FOR EACH ROW EXECUTE FUNCTION guard_commercial_vehicle_custody();
CREATE TRIGGER commercial_vehicle_custody BEFORE UPDATE OF "status" ON "Vehicle" FOR EACH ROW EXECUTE FUNCTION guard_commercial_vehicle_custody();
CREATE TRIGGER commercial_retail_reservation_custody BEFORE UPDATE OF "reservationSnapshot" ON "InventoryRetailCompletion" FOR EACH ROW EXECUTE FUNCTION guard_commercial_vehicle_custody();
CREATE TRIGGER commercial_delivery_custody BEFORE UPDATE OF "status" ON "VehicleCommercialHandoff" FOR EACH ROW EXECUTE FUNCTION guard_commercial_vehicle_custody();
CREATE TRIGGER commercial_deal_custody BEFORE INSERT OR UPDATE OF "status", "pathway", "snapshot" ON "DealDeskDraft" FOR EACH ROW EXECUTE FUNCTION guard_commercial_vehicle_custody();
CREATE TRIGGER commercial_packet_custody BEFORE UPDATE OF "state" ON "SalesDocumentJacket" FOR EACH ROW EXECUTE FUNCTION guard_commercial_vehicle_custody();

CREATE FUNCTION guard_vehicle_use_commercial_claim() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."status" NOT IN ('RESERVED', 'CHECKED_OUT') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."organizationId" || ':' || NEW."vehicleId", 0));
  IF EXISTS (SELECT 1 FROM "VehicleUseBooking" b WHERE b."organizationId" = NEW."organizationId" AND b."vehicleId" = NEW."vehicleId" AND b."id" <> NEW."id" AND b."status" IN ('RETURNED', 'RETURNED_REVIEW') AND vehicle_return_review_pending(b)) THEN
    RAISE EXCEPTION 'Complete the prior vehicle return review before assigning this vehicle.' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM "Vehicle" v WHERE v."id" = NEW."vehicleId" AND v."organizationId" = NEW."organizationId" AND v."status" = 'SOLD')
    OR EXISTS (SELECT 1 FROM "InventoryUnit" i WHERE i."organizationId" = NEW."organizationId" AND i."vehicleId" = NEW."vehicleId" AND i."closedAt" IS NULL AND i."lifecycleStage" IN ('RESERVED_DEAL_PENDING', 'SOLD', 'DELIVERED', 'WHOLESALED_OR_OTHER_DISPOSITION'))
    OR EXISTS (SELECT 1 FROM "VehicleCommercialHandoff" h WHERE h."organizationId" = NEW."organizationId" AND h."vehicleId" = NEW."vehicleId" AND h."handoffType" = 'DELIVERY' AND h."status" = 'COMPLETED')
    OR EXISTS (
      SELECT 1 FROM "DealDeskDraft" d
      LEFT JOIN "DealWorkflowContext" c ON c."draftId" = d."id"
      JOIN "Vehicle" v ON v."id" = NEW."vehicleId"
      WHERE (d."organizationId" = NEW."organizationId" OR (NEW."organizationId" = 'org-time-motor-sales' AND d."organizationId" = 'default-org'))
        AND vehicle_commercial_pathway(d."pathway")
        AND (d."status" = 'SOLD' OR (d."status" = 'PENDING' AND d."snapshot" ? 'desk:soldVehicleId'))
        AND (COALESCE(d."snapshot" ->> 'desk:soldVehicleId', c."vehicleId", d."snapshot" #>> '{desk:identity,vehicleId}') = v."id"
          OR (v."vin" ~ '^[A-HJ-NPR-Z0-9]{17}$' AND v."vin" = upper(COALESCE(NULLIF(btrim(d."snapshot" -> (d."pathway" || ':vehicleFacts') ->> 'vin'), ''), btrim(d."vehicleReference"))))
          OR vehicle_commercial_reference_matches(v, d."snapshot" -> (d."pathway" || ':vehicleFacts') ->> 'stockNumber')
          OR vehicle_commercial_reference_matches(v, d."vehicleReference"))
    ) OR EXISTS (
      SELECT 1 FROM "SalesDocumentJacket" j JOIN "Vehicle" v ON v."id" = NEW."vehicleId"
      WHERE (j."organizationId" = NEW."organizationId" OR (NEW."organizationId" = 'org-time-motor-sales' AND j."organizationId" = 'default-org'))
        AND vehicle_commercial_pathway(j."pathway") AND j."state" IN ('CLOSED', 'DELIVERED_FUNDING_PENDING', 'UNWIND_PENDING')
        AND ((v."vin" ~ '^[A-HJ-NPR-Z0-9]{17}$' AND v."vin" = upper(btrim(j."vin"))) OR vehicle_commercial_reference_matches(v, j."stockNumber") OR vehicle_commercial_reference_matches(v, j."vehicleReference"))
    ) THEN
    RAISE EXCEPTION 'This vehicle has a sale or retail reservation. Resolve it in the sales workflow before assigning temporary use.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicle_use_commercial_claim BEFORE INSERT OR UPDATE ON "VehicleUseBooking" FOR EACH ROW EXECUTE FUNCTION guard_vehicle_use_commercial_claim();
