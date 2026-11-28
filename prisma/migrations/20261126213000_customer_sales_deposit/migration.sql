CREATE TABLE "CustomerSalesDeposit" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "vehicleId" TEXT,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "method" TEXT NOT NULL CHECK ("method" IN ('CASH','CHECK','OTHER_CARD')),
  "paymentReference" TEXT,
  "nonRefundable" BOOLEAN NOT NULL,
  "terms" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "vehicleLabel" TEXT,
  "vin" TEXT,
  "receivedById" TEXT NOT NULL,
  "receivedByName" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "refundedAt" TIMESTAMP(3),
  "refundedById" TEXT,
  "refundReference" TEXT,
  "refundReason" TEXT,
  CONSTRAINT "CustomerSalesDeposit_customerId_organizationId_fkey" FOREIGN KEY ("customerId","organizationId") REFERENCES "Customer"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerSalesDeposit_vehicleId_organizationId_fkey" FOREIGN KEY ("vehicleId","organizationId") REFERENCES "Vehicle"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_sales_deposit_complete_refund" CHECK (
    num_nonnulls("refundedAt","refundedById","refundReference","refundReason") IN (0,4)
    AND ("refundedAt" IS NULL OR "refundedAt" >= "receivedAt")
  )
);
CREATE INDEX "CustomerSalesDeposit_organizationId_customerId_receivedAt_idx" ON "CustomerSalesDeposit" ("organizationId","customerId","receivedAt");
CREATE UNIQUE INDEX "CustomerSalesDeposit_organizationId_method_paymentReference_key" ON "CustomerSalesDeposit" ("organizationId","method","paymentReference");
CREATE UNIQUE INDEX "CustomerSalesDeposit_organizationId_method_refundReference_key" ON "CustomerSalesDeposit" ("organizationId","method","refundReference");
CREATE UNIQUE INDEX "one_active_sales_deposit_per_vehicle" ON "CustomerSalesDeposit" ("organizationId","vehicleId") WHERE "vehicleId" IS NOT NULL AND "refundedAt" IS NULL;

CREATE FUNCTION assert_customer_deposit_hold(target_org text, target_vehicle text, buyer text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_org || ':' || target_vehicle, 0));
  IF EXISTS (
    SELECT 1 FROM "CustomerSalesDeposit" d WHERE d."organizationId" = target_org
      AND d."vehicleId" = target_vehicle AND d."refundedAt" IS NULL AND d."customerId" IS DISTINCT FROM buyer
  ) THEN
    RAISE EXCEPTION 'Vehicle is held by a customer deposit. Use the deposit customer on the sale or record a verified full refund in Customer 360.' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- A generic inventory transition has no buyer. Only accept independently recorded
-- same-vehicle deal evidence, never a name or an arbitrary text label.
CREATE FUNCTION deposit_retail_buyer(target_org text, target_vehicle text, proof jsonb) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT d."customerId"
  FROM "DealDeskDraft" d
  JOIN "Customer" c ON c."id" = d."customerId" AND c."organizationId" = target_org
  LEFT JOIN "DealWorkflowContext" ctx ON ctx."draftId" = d."id" AND ctx."organizationId" = target_org AND ctx."customerId" = c."id"
  WHERE deal_document_organization_matches(d."organizationId", target_org)
    AND vehicle_commercial_pathway(d."pathway")
    AND d."status" IN ('IN_PROGRESS','PENDING','SOLD')
    AND COALESCE(d."snapshot" ->> 'desk:soldVehicleId',ctx."vehicleId") = target_vehicle
    AND d."id" = proof ->> 'dealReference'
    AND proof ->> 'customerReference' IN (c."id",c."customerNumber");
$$;

CREATE FUNCTION guard_customer_deposit_sale() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  candidate record;
  target_vehicle text;
  buyer text;
  proof jsonb;
BEGIN
  IF TG_TABLE_NAME = 'DealDeskDraft' THEN
    IF NEW."status" <> 'SOLD' OR NOT vehicle_commercial_pathway(NEW."pathway") THEN RETURN NEW; END IF;
    FOR candidate IN SELECT * FROM vehicle_commercial_match(NEW."organizationId",
      COALESCE(NEW."snapshot" ->> 'desk:soldVehicleId',(SELECT "vehicleId" FROM "DealWorkflowContext" WHERE "draftId" = NEW."id"),NEW."snapshot" #>> '{desk:identity,vehicleId}'),
      upper(COALESCE(NULLIF(btrim(NEW."snapshot" -> (NEW."pathway" || ':vehicleFacts') ->> 'vin'),''),btrim(NEW."vehicleReference"))),
      ARRAY[NEW."snapshot" -> (NEW."pathway" || ':vehicleFacts') ->> 'stockNumber',NEW."vehicleReference"]) ORDER BY vehicle_id LOOP
      PERFORM assert_customer_deposit_hold(candidate.organization_id,candidate.vehicle_id,NEW."customerId");
    END LOOP;
  ELSIF TG_TABLE_NAME = 'SalesDocumentJacket' THEN
    IF vehicle_commercial_pathway(NEW."pathway") AND NEW."state" IN ('CLOSED','DELIVERED_FUNDING_PENDING') THEN
      FOR candidate IN SELECT * FROM vehicle_commercial_match(NEW."organizationId",NULL,upper(btrim(NEW."vin")),ARRAY[NEW."stockNumber",NEW."vehicleReference"]) ORDER BY vehicle_id LOOP
        PERFORM assert_customer_deposit_hold(candidate.organization_id,candidate.vehicle_id,NEW."customerId");
      END LOOP;
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
      IF NEW."lifecycleStage" <> 'WHOLESALED_OR_OTHER_DISPOSITION' THEN
        SELECT deposit_retail_buyer(NEW."organizationId",NEW."vehicleId",CASE WHEN NEW."lifecycleStage" = 'RESERVED_DEAL_PENDING'
          THEN r."reservationSnapshot" ELSE r."saleAuthorizationSnapshot" END) INTO buyer
        FROM "InventoryRetailCompletion" r WHERE r."inventoryUnitId" = NEW."id" AND r."organizationId" = NEW."organizationId";
      END IF;
      PERFORM assert_customer_deposit_hold(NEW."organizationId",NEW."vehicleId",buyer);
    END IF;
  ELSIF TG_TABLE_NAME = 'Vehicle' THEN
    IF NEW."status" = 'SOLD' AND (TG_OP = 'INSERT' OR OLD."status" IS DISTINCT FROM NEW."status") THEN
      SELECT h."customerId" INTO buyer FROM "VehicleCommercialHandoff" h WHERE h."vehicleId" = NEW."id" AND h."organizationId" = NEW."organizationId"
        AND h."handoffType" = 'DELIVERY' AND h."status" = 'RECONCILED' ORDER BY h."version" DESC LIMIT 1;
      IF buyer IS NULL THEN
        SELECT deposit_retail_buyer(NEW."organizationId",NEW."id",r."saleAuthorizationSnapshot") INTO buyer
        FROM "InventoryRetailCompletion" r JOIN "InventoryUnit" u ON u."id" = r."inventoryUnitId"
        WHERE u."vehicleId" = NEW."id" AND u."organizationId" = NEW."organizationId" AND u."lifecycleStage" = 'DELIVERED'
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

CREATE TRIGGER deposit_guard_deal BEFORE INSERT OR UPDATE OF "status","pathway","snapshot","customerId","vehicleReference" ON "DealDeskDraft" FOR EACH ROW EXECUTE FUNCTION guard_customer_deposit_sale();
CREATE TRIGGER deposit_guard_packet BEFORE INSERT OR UPDATE OF "state","customerId","vin","stockNumber","vehicleReference" ON "SalesDocumentJacket" FOR EACH ROW EXECUTE FUNCTION guard_customer_deposit_sale();
CREATE TRIGGER deposit_guard_handoff BEFORE INSERT OR UPDATE OF "status","customerId","vehicleId" ON "VehicleCommercialHandoff" FOR EACH ROW EXECUTE FUNCTION guard_customer_deposit_sale();
CREATE TRIGGER deposit_guard_retail BEFORE INSERT OR UPDATE OF "stage","reservationSnapshot","saleAuthorizationSnapshot" ON "InventoryRetailCompletion" FOR EACH ROW EXECUTE FUNCTION guard_customer_deposit_sale();
CREATE TRIGGER deposit_guard_inventory BEFORE INSERT OR UPDATE OF "lifecycleStage" ON "InventoryUnit" FOR EACH ROW EXECUTE FUNCTION guard_customer_deposit_sale();
CREATE TRIGGER deposit_guard_vehicle BEFORE UPDATE OF "status" ON "Vehicle" FOR EACH ROW EXECUTE FUNCTION guard_customer_deposit_sale();
CREATE TRIGGER deposit_guard_temporary_use BEFORE INSERT OR UPDATE OF "status","vehicleId" ON "VehicleUseBooking" FOR EACH ROW EXECUTE FUNCTION guard_customer_deposit_sale();
