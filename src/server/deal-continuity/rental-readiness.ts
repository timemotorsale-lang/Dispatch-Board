import type { Prisma } from "@prisma/client";
import type { DealVehicleChoice } from "@/lib/deal-continuity";
import { legacyRentalReturnWithoutCompletion } from "./custody-selection";

export const rentalReadinessAction = "CONFIRM_RENTAL_READINESS";

export function isRentalPathway(pathway: string) {
  return pathway === "daily-rental" || pathway === "vehicle-loaner";
}

export async function readRentalReadiness(db: Prisma.TransactionClient, context: { id: string; organizationId: string }, vehicle: DealVehicleChoice) {
  const { organizationId, id: contextId } = context;
  const unitId = vehicle.inventoryUnitId;
  const blocked = (detail: string) => ({ eligible: false, detail, inventoryUnitId: unitId, review: null });
  if (vehicle.eligibleForUse) return { eligible: true, detail: vehicle.availability, inventoryUnitId: unitId, review: null };
  if (!unitId) return blocked("Complete Inventory Intake for this vehicle first");

  const unit = await db.inventoryUnit.findFirst({ where: { id: unitId, organizationId, vehicleId: vehicle.id, closedAt: null } });
  if (!unit || !vehicle.vin || unit.operatingState !== "ACTIVE" || !["PURCHASED_OR_TRADE_IN", "RECEIVED", "INSPECTION"].includes(unit.lifecycleStage)) return blocked(vehicle.availability);
  const now = new Date();
  const [intake, ownership, repair, occupancy, confirmation] = await Promise.all([
    db.inventoryIntakeRevision.findFirst({ where: { organizationId, vehicleId: vehicle.id }, orderBy: { version: "desc" }, select: { id: true, status: true, inventoryUnitId: true } }),
    db.vehicleRelationship.findFirst({ where: {
      organizationId, vehicleId: vehicle.id, relationshipType: { in: ["DEALERSHIP_OWNED", "TRADE_IN"] },
      effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }]
    }, select: { id: true } }),
    db.repairOrder.findFirst({ where: { organizationId, vehicleId: vehicle.id, closedAt: null }, select: { id: true } }),
    db.vehicleUseBooking.findFirst({ where: { organizationId, vehicleId: vehicle.id, OR: [{ status: { in: ["CHECKED_OUT", "RETURNED_REVIEW"] } }, legacyRentalReturnWithoutCompletion] }, select: { id: true } }),
    db.dealContinuityEvent.findFirst({ where: { organizationId, contextId, action: rentalReadinessAction }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], select: { result: true } })
  ]);
  if (occupancy) return blocked(vehicle.availability);
  if (!ownership) return blocked("Verify current dealership ownership before using the rental readiness check");
  if (!intake || intake.status !== "CONFIRMED" || intake.inventoryUnitId !== unit.id) return blocked("Confirm acquisition intake before checking rental readiness");
  if (repair) return blocked("Resolve the open repair order before checking rental readiness");

  const review = { vehicleId: vehicle.id, inventoryUnitId: unit.id, unitVersion: unit.version, intakeRevisionId: intake.id };
  const previous = confirmation?.result as Partial<typeof review> | undefined;
  if (previous?.vehicleId === review.vehicleId && previous.inventoryUnitId === review.inventoryUnitId && previous.unitVersion === review.unitVersion && previous.intakeRevisionId === review.intakeRevisionId) {
    return { eligible: true, detail: "Rental readiness confirmed", inventoryUnitId: unit.id, review: null, noRepairsConfirmed: true };
  }
  return { eligible: false, detail: "Confirm the vehicle is ready to rent if it needs no repairs", inventoryUnitId: unit.id, review };
}
