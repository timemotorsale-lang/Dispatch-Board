CREATE OR REPLACE FUNCTION guard_customer_deposit_sale() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  candidate record;
  target_vehicle text;
  buyer text;
  proof jsonb;
  matched integer := 0;
BEGIN
  IF TG_TABLE_NAME = 'DealDeskDraft' THEN
    IF NEW."status" <> 'SOLD' OR NOT vehicle_commercial_pathway(NEW."pathway") THEN RETURN NEW; END IF;
    FOR candidate IN SELECT * FROM vehicle_commercial_match(NEW."organizationId",
      COALESCE(NEW."snapshot" ->> 'desk:soldVehicleId',(SELECT "vehicleId" FROM "DealWorkflowContext" WHERE "draftId" = NEW."id"),NEW."snapshot" #>> '{desk:identity,vehicleId}'),
      upper(COALESCE(NULLIF(btrim(NEW."snapshot" -> (NEW."pathway" || ':vehicleFacts') ->> 'vin'),''),btrim(NEW."vehicleReference"))),
      ARRAY[NEW."snapshot" -> (NEW."pathway" || ':vehicleFacts') ->> 'stockNumber',NEW."vehicleReference"]) ORDER BY vehicle_id LOOP
      SELECT c."id" INTO buyer FROM "Customer" c WHERE c."id" = NEW."customerId" AND c."organizationId" = candidate.organization_id
        AND lower(btrim(c."displayName")) = lower(btrim(NEW."customerName"));
      PERFORM assert_customer_deposit_hold(candidate.organization_id,candidate.vehicle_id,buyer);
    END LOOP;
  ELSIF TG_TABLE_NAME = 'SalesDocumentJacket' THEN
    IF vehicle_commercial_pathway(NEW."pathway") AND NEW."state" IN ('CLOSED','DELIVERED_FUNDING_PENDING') THEN
      SELECT COALESCE(d."snapshot" ->> 'desk:soldVehicleId',ctx."vehicleId",d."snapshot" #>> '{desk:identity,vehicleId}') INTO target_vehicle
      FROM "DealDeskDraft" d
      LEFT JOIN "DealWorkflowContext" ctx ON ctx."draftId" = d."id" AND ctx."customerId" = d."customerId"
      WHERE d."snapshot" -> 'jackets' ->> d."pathway" = NEW."id"
        AND d."pathway" = NEW."pathway" AND d."customerId" = NEW."customerId"
        AND deal_document_organization_matches(d."organizationId", CASE WHEN NEW."organizationId" = 'default-org' THEN 'org-time-motor-sales' ELSE NEW."organizationId" END)
      ORDER BY d."id" LIMIT 1;
      FOR candidate IN SELECT * FROM vehicle_commercial_match(NEW."organizationId",target_vehicle,upper(btrim(NEW."vin")),ARRAY[NEW."stockNumber",NEW."vehicleReference"]) ORDER BY vehicle_id LOOP
        matched := matched + 1;
        SELECT c."id" INTO buyer FROM "Customer" c WHERE c."id" = NEW."customerId" AND c."organizationId" = candidate.organization_id
          AND lower(btrim(c."displayName")) = lower(btrim(NEW."customerName"))
          AND target_vehicle = candidate.vehicle_id;
        PERFORM assert_customer_deposit_hold(candidate.organization_id,candidate.vehicle_id,buyer);
      END LOOP;
      IF matched = 0 AND EXISTS (SELECT 1 FROM "CustomerSalesDeposit" h WHERE h."vehicleId" IS NOT NULL AND h."refundedAt" IS NULL
        AND deal_document_organization_matches(NEW."organizationId",h."organizationId")) THEN
        RAISE EXCEPTION 'Link one canonical vehicle before finalizing paperwork while customer deposit holds exist.' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'VehicleCommercialHandoff' THEN
    IF NEW."handoffType" = 'DELIVERY' AND NEW."status" IN ('COMPLETED','RECONCILED') THEN
      PERFORM assert_customer_deposit_hold(NEW."organizationId",NEW."vehicleId",NEW."customerId");
    END IF;
  ELSIF TG_TABLE_NAME = 'InventoryRetailCompletion' THEN
    IF NEW."stage" IN ('RESERVED_DEAL_PENDING','SALE_AUTHORIZATION','DELIVERY_READINESS','DELIVERY_HOLD','SOLD_AWAITING_DELIVERY','RECONCILIATION_HOLD','DELIVERED_RECONCILED') THEN
      SELECT u."vehicleId" INTO target_vehicle FROM "InventoryUnit" u WHERE u."id" = NEW."inventoryUnitId" AND u."organizationId" = NEW."organizationId";
      proof := CASE WHEN NEW."stage" = 'RESERVED_DEAL_PENDING' THEN NEW."reservationSnapshot" ELSE NEW."saleAuthorizationSnapshot" END;
      PERFORM assert_customer_deposit_hold(NEW."organizationId",target_vehicle,deposit_retail_buyer(NEW."organizationId",target_vehicle,proof));
    END IF;
  ELSIF TG_TABLE_NAME = 'InventoryUnit' THEN
    IF NEW."lifecycleStage" IN ('RESERVED_DEAL_PENDING','SOLD','DELIVERED','WHOLESALED_OR_OTHER_DISPOSITION')
       AND (TG_OP = 'INSERT' OR OLD."lifecycleStage" IS DISTINCT FROM NEW."lifecycleStage") THEN
      IF NEW."lifecycleStage" <> 'WHOLESALED_OR_OTHER_DISPOSITION' AND current_setting('app.deposit_retail_unit', true) = NEW."id" THEN
        SELECT deposit_retail_buyer(NEW."organizationId",NEW."vehicleId",CASE WHEN NEW."lifecycleStage" = 'RESERVED_DEAL_PENDING'
          THEN r."reservationSnapshot" ELSE r."saleAuthorizationSnapshot" END) INTO buyer
        FROM "InventoryRetailCompletion" r WHERE r."inventoryUnitId" = NEW."id" AND r."organizationId" = NEW."organizationId";
      END IF;
      PERFORM assert_customer_deposit_hold(NEW."organizationId",NEW."vehicleId",buyer);
    END IF;
  ELSIF TG_TABLE_NAME = 'Vehicle' THEN
    IF NEW."status" = 'SOLD' AND (TG_OP = 'INSERT' OR OLD."status" IS DISTINCT FROM NEW."status") THEN
      SELECT h."customerId" INTO buyer FROM "VehicleCommercialHandoff" h WHERE h."vehicleId" = NEW."id" AND h."organizationId" = NEW."organizationId"
        AND h."handoffType" = 'DELIVERY' AND h."status" = 'RECONCILED'
        AND h."id" = current_setting('app.deposit_delivery_handoff', true) LIMIT 1;
      IF buyer IS NULL THEN
        SELECT deposit_retail_buyer(NEW."organizationId",NEW."id",r."saleAuthorizationSnapshot") INTO buyer
        FROM "InventoryRetailCompletion" r JOIN "InventoryUnit" u ON u."id" = r."inventoryUnitId"
        WHERE u."vehicleId" = NEW."id" AND u."organizationId" = NEW."organizationId" AND u."lifecycleStage" = 'DELIVERED'
          AND r."stage" = 'DELIVERED_RECONCILED' AND u."id" = current_setting('app.deposit_retail_unit', true)
        ORDER BY r."updatedAt" DESC LIMIT 1;
      END IF;
      PERFORM assert_customer_deposit_hold(NEW."organizationId",NEW."id",buyer);
    END IF;
  ELSIF TG_TABLE_NAME = 'VehicleUseBooking' AND NEW."status" IN ('RESERVED','CHECKED_OUT') THEN
    PERFORM assert_customer_deposit_hold(NEW."organizationId",NEW."vehicleId",NULL);
  END IF;
  RETURN NEW;
END;
$$;

