-- Fail safely if legacy assignments conflict; reconcile actual custody before retrying.
-- No existing deal, agreement, financial or booking records are rewritten.
CREATE UNIQUE INDEX "VehicleUseBooking_one_checked_out_vehicle"
ON "VehicleUseBooking" ("organizationId", "vehicleId")
WHERE "status" = 'CHECKED_OUT';

CREATE UNIQUE INDEX "VehicleUseBooking_one_open_context"
ON "VehicleUseBooking" ("organizationId", "contextId")
WHERE "status" IN ('RESERVED', 'CHECKED_OUT');
