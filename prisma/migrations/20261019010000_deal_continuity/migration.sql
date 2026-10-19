-- CreateTable
CREATE TABLE "DealWorkflowContext" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "inventoryUnitId" TEXT,
    "sourceDraftId" TEXT,
    "sourceJacketId" TEXT,
    "sourceVehicleId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealWorkflowContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleUseBooking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "agreementJacketId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expectedReturnAt" TIMESTAMP(3) NOT NULL,
    "checkedOutAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "departureSnapshot" JSONB,
    "returnSnapshot" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleUseBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealContinuityEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "bookingId" TEXT,
    "operationKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealContinuityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealWorkflowContext_draftId_key" ON "DealWorkflowContext"("draftId");

-- CreateIndex
CREATE INDEX "DealWorkflowContext_organizationId_customerId_idx" ON "DealWorkflowContext"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "VehicleUseBooking_organizationId_vehicleId_status_startsAt_idx" ON "VehicleUseBooking"("organizationId", "vehicleId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "VehicleUseBooking_contextId_createdAt_idx" ON "VehicleUseBooking"("contextId", "createdAt");

-- CreateIndex
CREATE INDEX "DealContinuityEvent_contextId_occurredAt_idx" ON "DealContinuityEvent"("contextId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "DealContinuityEvent_organizationId_operationKey_key" ON "DealContinuityEvent"("organizationId", "operationKey");

-- AddForeignKey
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT "DealWorkflowContext_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT "DealWorkflowContext_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DealDeskDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT "DealWorkflowContext_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT "DealWorkflowContext_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT "DealWorkflowContext_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT "DealWorkflowContext_sourceDraftId_fkey" FOREIGN KEY ("sourceDraftId") REFERENCES "DealDeskDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT "DealWorkflowContext_sourceJacketId_fkey" FOREIGN KEY ("sourceJacketId") REFERENCES "SalesDocumentJacket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT "DealWorkflowContext_sourceVehicleId_fkey" FOREIGN KEY ("sourceVehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleUseBooking" ADD CONSTRAINT "VehicleUseBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleUseBooking" ADD CONSTRAINT "VehicleUseBooking_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "DealWorkflowContext"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleUseBooking" ADD CONSTRAINT "VehicleUseBooking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleUseBooking" ADD CONSTRAINT "VehicleUseBooking_agreementJacketId_fkey" FOREIGN KEY ("agreementJacketId") REFERENCES "SalesDocumentJacket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContinuityEvent" ADD CONSTRAINT "DealContinuityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContinuityEvent" ADD CONSTRAINT "DealContinuityEvent_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "DealWorkflowContext"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContinuityEvent" ADD CONSTRAINT "DealContinuityEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "VehicleUseBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE FUNCTION guard_deal_continuity_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DealDeskDraft" d JOIN "Customer" c ON c."id" = NEW."customerId" WHERE d."id" = NEW."draftId" AND d."organizationId" = NEW."organizationId" AND c."organizationId" = NEW."organizationId" AND d."customerId" = c."id") THEN RAISE EXCEPTION 'Deal context customer and organization mismatch'; END IF;
  IF NEW."vehicleId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Vehicle" WHERE "id" = NEW."vehicleId" AND "organizationId" = NEW."organizationId" AND "mergedIntoVehicleId" IS NULL) THEN RAISE EXCEPTION 'Deal context vehicle mismatch'; END IF;
  IF NEW."inventoryUnitId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "InventoryUnit" WHERE "id" = NEW."inventoryUnitId" AND "vehicleId" = NEW."vehicleId" AND "organizationId" = NEW."organizationId" AND "closedAt" IS NULL) THEN RAISE EXCEPTION 'Deal context inventory mismatch'; END IF;
  IF NEW."sourceDraftId" = NEW."draftId" THEN RAISE EXCEPTION 'A deal cannot be its own source'; END IF;
  IF NEW."sourceDraftId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "DealDeskDraft" WHERE "id" = NEW."sourceDraftId" AND "organizationId" = NEW."organizationId" AND ("customerId" IS NULL OR "customerId" = NEW."customerId")) THEN RAISE EXCEPTION 'Related deal customer mismatch'; END IF;
  IF NEW."sourceJacketId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SalesDocumentJacket" WHERE "id" = NEW."sourceJacketId" AND "organizationId" = NEW."organizationId" AND ("customerId" IS NULL OR "customerId" = NEW."customerId")) THEN RAISE EXCEPTION 'Related agreement customer mismatch'; END IF;
  IF NEW."sourceVehicleId" IS NOT NULL AND (NEW."sourceVehicleId" = NEW."vehicleId" OR NOT EXISTS (SELECT 1 FROM "Vehicle" WHERE "id" = NEW."sourceVehicleId" AND "organizationId" = NEW."organizationId")) THEN RAISE EXCEPTION 'The original and temporary vehicle must be separate canonical vehicles'; END IF;
  IF TG_OP = 'UPDATE' AND (OLD."customerId",OLD."vehicleId",OLD."sourceDraftId",OLD."sourceJacketId",OLD."sourceVehicleId") IS DISTINCT FROM (NEW."customerId",NEW."vehicleId",NEW."sourceDraftId",NEW."sourceJacketId",NEW."sourceVehicleId") AND EXISTS (SELECT 1 FROM "VehicleUseBooking" WHERE "contextId" = OLD."id" AND "status" IN ('RESERVED','CHECKED_OUT')) THEN RAISE EXCEPTION 'Return or cancel the active assignment before changing identity'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER deal_continuity_scope BEFORE INSERT OR UPDATE ON "DealWorkflowContext" FOR EACH ROW EXECUTE FUNCTION guard_deal_continuity_scope();

ALTER TABLE "VehicleUseBooking" ADD CONSTRAINT vehicle_use_status CHECK ("status" IN ('RESERVED','CHECKED_OUT','RETURNED','CANCELLED'));
ALTER TABLE "VehicleUseBooking" ADD CONSTRAINT vehicle_use_period CHECK ("expectedReturnAt" > "startsAt" AND ("returnedAt" IS NULL OR ("checkedOutAt" IS NOT NULL AND "returnedAt" >= "checkedOutAt")));
CREATE UNIQUE INDEX vehicle_use_one_active_context ON "VehicleUseBooking" ("contextId") WHERE "status" IN ('RESERVED','CHECKED_OUT');
ALTER TABLE "DealWorkflowContext" ADD CONSTRAINT deal_one_source CHECK ("sourceDraftId" IS NULL OR "sourceJacketId" IS NULL);
CREATE FUNCTION guard_vehicle_use_booking() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Vehicle use history cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' AND (NEW."status" <> 'RESERVED' OR NEW."version" <> 1) THEN RAISE EXCEPTION 'A new assignment must begin as a reservation'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."organizationId" || ':' || NEW."vehicleId", 0));
  IF NOT EXISTS (SELECT 1 FROM "DealWorkflowContext" WHERE "id" = NEW."contextId" AND "organizationId" = NEW."organizationId" AND "vehicleId" = NEW."vehicleId") THEN RAISE EXCEPTION 'Vehicle booking context mismatch'; END IF;
  IF NEW."agreementJacketId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "SalesDocumentJacket" j JOIN "DealWorkflowContext" c ON c."id" = NEW."contextId" WHERE j."id" = NEW."agreementJacketId" AND j."organizationId" = NEW."organizationId" AND j."customerId" = c."customerId") THEN RAISE EXCEPTION 'Vehicle booking agreement mismatch'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (OLD."organizationId",OLD."contextId",OLD."vehicleId",OLD."startsAt") IS DISTINCT FROM (NEW."organizationId",NEW."contextId",NEW."vehicleId",NEW."startsAt") THEN RAISE EXCEPTION 'Assignment identity is immutable'; END IF;
    IF NEW."version" <> OLD."version" + 1 OR OLD."status" IN ('RETURNED','CANCELLED') OR (OLD."status"='CHECKED_OUT' AND NEW."status" NOT IN ('CHECKED_OUT','RETURNED')) THEN RAISE EXCEPTION 'Invalid vehicle use transition or version'; END IF;
    IF NEW."status"='RETURNED' AND OLD."status"<>'CHECKED_OUT' THEN RAISE EXCEPTION 'Actual handoff must precede return'; END IF;
    IF OLD."status"='CHECKED_OUT' AND (OLD."checkedOutAt",OLD."agreementJacketId",OLD."departureSnapshot") IS DISTINCT FROM (NEW."checkedOutAt",NEW."agreementJacketId",NEW."departureSnapshot") THEN RAISE EXCEPTION 'Actual departure evidence is immutable'; END IF;
  END IF;
  IF NEW."status" IN ('CHECKED_OUT','RETURNED') AND (NEW."checkedOutAt" IS NULL OR NEW."agreementJacketId" IS NULL OR NEW."departureSnapshot" IS NULL OR NEW."checkedOutAt" < NEW."startsAt" OR NEW."checkedOutAt" >= NEW."expectedReturnAt") THEN RAISE EXCEPTION 'Actual handoff requires an agreement, evidence and a valid use period'; END IF;
  IF NEW."status"='RETURNED' AND (NEW."returnedAt" IS NULL OR NEW."returnSnapshot" IS NULL) THEN RAISE EXCEPTION 'Actual return evidence is required'; END IF;
  IF NEW."status"='CHECKED_OUT' AND NOT EXISTS (SELECT 1 FROM "SalesDocumentJacket" j JOIN "Vehicle" v ON v."id"=NEW."vehicleId" JOIN "DealWorkflowContext" c ON c."id"=NEW."contextId" JOIN "DealDeskDraft" d ON d."id"=c."draftId" WHERE j."id"=NEW."agreementJacketId" AND j."organizationId"=NEW."organizationId" AND j."customerId"=c."customerId" AND j."vin"=v."vin" AND j."pathway"=d."pathway" AND j."state"='CHECKED_OUT' AND EXISTS (SELECT 1 FROM "SalesDocumentPacketVersion" p WHERE p."jacketId"=j."id" AND p."phase"='CHECKOUT')) THEN RAISE EXCEPTION 'A finalized exact vehicle agreement is required'; END IF;
  IF NEW."status" IN ('RESERVED','CHECKED_OUT') AND EXISTS (SELECT 1 FROM "VehicleUseBooking" b WHERE b."organizationId"=NEW."organizationId" AND b."vehicleId"=NEW."vehicleId" AND b."id"<>NEW."id" AND (b."status"='CHECKED_OUT' OR (b."status"='RESERVED' AND b."startsAt"<NEW."expectedReturnAt" AND b."expectedReturnAt">NEW."startsAt"))) THEN RAISE EXCEPTION 'Vehicle is already assigned or reserved'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vehicle_use_booking_guard BEFORE INSERT OR UPDATE OR DELETE ON "VehicleUseBooking" FOR EACH ROW EXECUTE FUNCTION guard_vehicle_use_booking();
CREATE FUNCTION guard_deal_continuity_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Deal continuity evidence is append-only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "DealWorkflowContext" WHERE "id"=NEW."contextId" AND "organizationId"=NEW."organizationId") OR (NEW."bookingId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "VehicleUseBooking" WHERE "id"=NEW."bookingId" AND "contextId"=NEW."contextId" AND "organizationId"=NEW."organizationId")) THEN RAISE EXCEPTION 'Deal continuity event scope mismatch'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER deal_continuity_event_guard BEFORE INSERT OR UPDATE OR DELETE ON "DealContinuityEvent" FOR EACH ROW EXECUTE FUNCTION guard_deal_continuity_event();
