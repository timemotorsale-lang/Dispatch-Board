ALTER TABLE "VehicleUseBooking" DROP CONSTRAINT vehicle_use_status;
ALTER TABLE "VehicleUseBooking" ADD CONSTRAINT vehicle_use_status
  CHECK ("status" IN ('RESERVED', 'CHECKED_OUT', 'RETURNED_REVIEW', 'RETURNED', 'CANCELLED'));

DROP INDEX "VehicleUseBooking_one_open_context";
CREATE UNIQUE INDEX "VehicleUseBooking_one_open_context"
  ON "VehicleUseBooking" ("organizationId", "contextId")
  WHERE "status" IN ('RESERVED', 'CHECKED_OUT', 'RETURNED_REVIEW');

CREATE OR REPLACE FUNCTION guard_vehicle_use_booking() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  assignment_path text;
  is_rental boolean;
  is_guided_drive boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Vehicle use history cannot be deleted'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."organizationId" || ':' || NEW."vehicleId", 0));
  SELECT COALESCE(j."pathway", d."pathway") INTO assignment_path
    FROM "DealWorkflowContext" c
    JOIN "DealDeskDraft" d ON d."id" = c."draftId"
    LEFT JOIN "SalesDocumentJacket" j ON j."id" = NEW."agreementJacketId"
    WHERE c."id" = NEW."contextId" AND c."organizationId" = NEW."organizationId" AND c."vehicleId" = NEW."vehicleId";
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle booking context mismatch'; END IF;
  is_rental := assignment_path IN ('daily-rental', 'vehicle-loaner');
  is_guided_drive := assignment_path = 'test-drive' AND NEW."departureSnapshot" @> '{"guided":true}'::jsonb;
  IF TG_OP = 'INSERT' AND (NEW."version" <> 1 OR NOT (NEW."status" = 'RESERVED' OR (NEW."status" = 'CHECKED_OUT' AND is_guided_drive IS TRUE))) THEN
    RAISE EXCEPTION 'A new assignment must begin as a reservation or a guided test-drive release';
  END IF;
  IF NEW."agreementJacketId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "SalesDocumentJacket" j
    JOIN "DealWorkflowContext" c ON c."id" = NEW."contextId"
    JOIN "DealDeskDraft" d ON d."id" = c."draftId"
    WHERE j."id" = NEW."agreementJacketId" AND j."organizationId" = d."organizationId"
      AND deal_document_organization_matches(j."organizationId", NEW."organizationId") AND j."customerId" = c."customerId"
  ) THEN RAISE EXCEPTION 'Vehicle booking agreement mismatch'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (OLD."organizationId", OLD."contextId", OLD."vehicleId") IS DISTINCT FROM (NEW."organizationId", NEW."contextId", NEW."vehicleId")
      OR (OLD."startsAt" IS DISTINCT FROM NEW."startsAt" AND NOT (OLD."status" = 'RESERVED' AND NEW."status" = 'CHECKED_OUT' AND is_guided_drive IS TRUE))
    THEN RAISE EXCEPTION 'Assignment identity is immutable'; END IF;
    IF NEW."version" <> OLD."version" + 1 OR NOT (
      (OLD."status" = 'RESERVED' AND NEW."status" IN ('RESERVED', 'CHECKED_OUT', 'CANCELLED')) OR
      (OLD."status" = 'CHECKED_OUT' AND (NEW."status" IN ('CHECKED_OUT', 'RETURNED_REVIEW') OR (NOT is_rental AND NEW."status" = 'RETURNED'))) OR
      (OLD."status" = 'RETURNED_REVIEW' AND NEW."status" = 'RETURNED') OR
      (OLD."status" = 'RETURNED' AND NEW."status" = 'RETURNED' AND is_rental AND NOT (COALESCE(OLD."returnSnapshot", '{}'::jsonb) ? 'completion'))
    ) THEN RAISE EXCEPTION 'Invalid vehicle use transition or version'; END IF;
    IF OLD."status" IN ('CHECKED_OUT', 'RETURNED_REVIEW', 'RETURNED') AND
      (OLD."checkedOutAt", OLD."agreementJacketId", OLD."departureSnapshot") IS DISTINCT FROM (NEW."checkedOutAt", NEW."agreementJacketId", NEW."departureSnapshot")
    THEN RAISE EXCEPTION 'Actual departure evidence is immutable'; END IF;
    IF OLD."status" IN ('RETURNED_REVIEW', 'RETURNED') AND (
      OLD."returnedAt" IS DISTINCT FROM NEW."returnedAt" OR
      OLD."expectedReturnAt" IS DISTINCT FROM NEW."expectedReturnAt" OR
      NOT (NEW."returnSnapshot" @> COALESCE(OLD."returnSnapshot", '{}'::jsonb)) OR
      (is_rental AND NOT COALESCE(NEW."returnSnapshot" @> '{"completion":{"inspected":true}}'::jsonb, false))
    ) THEN RAISE EXCEPTION 'Preserve actual return evidence and record completion separately'; END IF;
  END IF;
  IF NEW."status" IN ('CHECKED_OUT', 'RETURNED_REVIEW', 'RETURNED') AND (
    NEW."checkedOutAt" IS NULL OR NEW."agreementJacketId" IS NULL OR NEW."departureSnapshot" IS NULL OR
    (NOT is_rental AND NEW."checkedOutAt" < NEW."startsAt") OR NEW."checkedOutAt" >= NEW."expectedReturnAt"
  ) THEN RAISE EXCEPTION 'Actual handoff requires an agreement, evidence and a valid use period'; END IF;
  IF NEW."status" IN ('RETURNED_REVIEW', 'RETURNED') AND (NEW."returnedAt" IS NULL OR NEW."returnSnapshot" IS NULL) THEN
    RAISE EXCEPTION 'Actual return evidence is required';
  END IF;
  IF NEW."status" = 'CHECKED_OUT' AND (TG_OP = 'INSERT' OR OLD."status" = 'RESERVED') AND NOT EXISTS (
    SELECT 1 FROM "SalesDocumentJacket" j
    JOIN "Vehicle" v ON v."id" = NEW."vehicleId"
    JOIN "DealWorkflowContext" c ON c."id" = NEW."contextId"
    JOIN "DealDeskDraft" d ON d."id" = c."draftId"
    WHERE j."id" = NEW."agreementJacketId" AND j."customerId" = c."customerId" AND j."vin" = v."vin"
      AND j."pathway" = d."pathway" AND j."state" = 'CHECKED_OUT'
      AND EXISTS (SELECT 1 FROM "SalesDocumentPacketVersion" p WHERE p."jacketId" = j."id" AND p."phase" = 'CHECKOUT')
  ) THEN RAISE EXCEPTION 'A finalized exact vehicle agreement is required'; END IF;
  IF NEW."status" IN ('RESERVED', 'CHECKED_OUT') AND EXISTS (
    SELECT 1 FROM "VehicleUseBooking" b
    WHERE b."organizationId" = NEW."organizationId" AND b."vehicleId" = NEW."vehicleId" AND b."id" <> NEW."id"
      AND (b."status" IN ('CHECKED_OUT', 'RETURNED_REVIEW') OR
        (b."status" = 'RESERVED' AND b."startsAt" < NEW."expectedReturnAt" AND b."expectedReturnAt" > COALESCE(NEW."checkedOutAt", NEW."startsAt")))
  ) THEN RAISE EXCEPTION 'Vehicle is already assigned or reserved'; END IF;
  RETURN NEW;
END $$;
