CREATE FUNCTION deal_document_organization_matches(document_organization text, company_organization text)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT document_organization = company_organization
    OR (document_organization = 'default-org' AND company_organization = 'org-time-motor-sales');
$$;

CREATE OR REPLACE FUNCTION guard_deal_continuity_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "DealDeskDraft" d JOIN "Customer" c ON c."id" = NEW."customerId"
    WHERE d."id" = NEW."draftId"
      AND deal_document_organization_matches(d."organizationId", NEW."organizationId")
      AND c."organizationId" = NEW."organizationId" AND d."customerId" = c."id"
  ) THEN RAISE EXCEPTION 'Deal context customer and organization mismatch'; END IF;
  IF NEW."vehicleId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Vehicle" WHERE "id" = NEW."vehicleId" AND "organizationId" = NEW."organizationId" AND "mergedIntoVehicleId" IS NULL) THEN RAISE EXCEPTION 'Deal context vehicle mismatch'; END IF;
  IF NEW."inventoryUnitId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "InventoryUnit" WHERE "id" = NEW."inventoryUnitId" AND "vehicleId" = NEW."vehicleId" AND "organizationId" = NEW."organizationId" AND "closedAt" IS NULL) THEN RAISE EXCEPTION 'Deal context inventory mismatch'; END IF;
  IF NEW."sourceDraftId" = NEW."draftId" THEN RAISE EXCEPTION 'A deal cannot be its own source'; END IF;
  IF NEW."sourceDraftId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DealDeskDraft" WHERE "id" = NEW."sourceDraftId" AND deal_document_organization_matches("organizationId", NEW."organizationId") AND ("customerId" IS NULL OR "customerId" = NEW."customerId")) THEN RAISE EXCEPTION 'Related deal customer mismatch'; END IF;
  IF NEW."sourceJacketId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SalesDocumentJacket" WHERE "id" = NEW."sourceJacketId" AND deal_document_organization_matches("organizationId", NEW."organizationId") AND ("customerId" IS NULL OR "customerId" = NEW."customerId")) THEN RAISE EXCEPTION 'Related agreement customer mismatch'; END IF;
  IF NEW."sourceVehicleId" IS NOT NULL AND (NEW."sourceVehicleId" = NEW."vehicleId" OR NOT EXISTS (SELECT 1 FROM "Vehicle" WHERE "id" = NEW."sourceVehicleId" AND "organizationId" = NEW."organizationId")) THEN RAISE EXCEPTION 'The original and temporary vehicle must be separate canonical vehicles'; END IF;
  IF TG_OP = 'UPDATE' AND (OLD."customerId",OLD."vehicleId",OLD."sourceDraftId",OLD."sourceJacketId",OLD."sourceVehicleId") IS DISTINCT FROM (NEW."customerId",NEW."vehicleId",NEW."sourceDraftId",NEW."sourceJacketId",NEW."sourceVehicleId") AND EXISTS (SELECT 1 FROM "VehicleUseBooking" WHERE "contextId" = OLD."id" AND "status" IN ('RESERVED','CHECKED_OUT')) THEN RAISE EXCEPTION 'Return or cancel the active assignment before changing identity'; END IF;
  RETURN NEW;
END $$;
