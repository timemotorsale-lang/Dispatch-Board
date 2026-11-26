import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { canCreateAppointment, canUseStaffCalendar } from "@/server/policies/access";
import { createAppointmentReadRepository } from "@/server/repositories/appointment-read-repository";
import { isCustomerOwnedForInventoryLifecycle } from "@/server/vehicle-registry/inventory-lifecycle-ownership";

export async function getEarlyReconContext(actor: AuthenticatedUser, vehicleId: string) {
  const organizationId = INITIAL_ORGANIZATION.id;
  const unit = await prisma.inventoryUnit.findFirst({
    where: {
      organizationId, vehicleId, closedAt: null, operatingState: { not: "CLOSED" },
      lifecycleStage: { notIn: ["SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] },
      vehicle: { status: "ACTIVE", mergedIntoVehicleId: null }
    },
    select: {
      id: true, locationId: true,
      vehicle: { select: { id: true, vehicleNumber: true, vin: true, stockNumber: true, year: true, make: true, model: true } }
    }
  });
  if (!unit) return null;
  const now = new Date();
  const grants = await createEnterpriseCommandRepository().listCapabilityGrants(actor.id, organizationId);
  const can = (capability: VehicleCapability, locationId: string | null = unit.locationId) =>
    evaluateVehicleCapability({ actor, capability, grants, locationId, now }).allowed;
  if (!can("INVENTORY_UNIT_VIEW") || await isCustomerOwnedForInventoryLifecycle(vehicleId, organizationId)) return null;
  const canReadOrder = can("REPAIR_ORDER_VIEW");
  const [order, appointmentAccess] = await Promise.all([
    canReadOrder ? prisma.repairOrder.findFirst({
      where: { organizationId, inventoryUnitId: unit.id, locationId: unit.locationId, origin: "INVENTORY_RECON", closedAt: null, operatingState: { not: "CLOSED" } },
      orderBy: [{ openedAt: "desc" }, { id: "desc" }],
      select: { id: true, stage: true, vendorWorks: { where: { status: { notIn: ["RETURNED", "QC_REQUIRED", "COMPLETED", "CANCELLED"] } }, select: { id: true }, take: 1 } }
    }) : null,
    // Staff Calendar and its draft review currently operate at the configured Minneapolis location.
    unit.locationId === INITIAL_MINNEAPOLIS_LOCATION.id && canUseStaffCalendar(actor)
      ? createAppointmentReadRepository(prisma).findActiveLocationAccess(actor.id, unit.locationId, now) : null
  ]);
  const canBook = Boolean(appointmentAccess?.canViewSchedule) && canCreateAppointment({ actor, ownerUserId: actor.id, locationAccess: appointmentAccess });
  return {
    ...unit,
    activeOrderId: order?.id ?? null,
    canRouteVendor: canReadOrder && can("REPAIR_ORDER_MANAGE") && (!order || (order.stage === "INTAKE" && !order.vendorWorks.length)),
    canStartOrder: canReadOrder && can("REPAIR_ORDER_MANAGE"),
    canBook
  };
}

export async function listEarlyReconAppointments(actor: AuthenticatedUser, context: NonNullable<Awaited<ReturnType<typeof getEarlyReconContext>>>) {
  if (!context.canBook) return [];
  return prisma.appointment.findMany({
    where: {
      organizationId: INITIAL_ORGANIZATION.id, locationId: context.locationId, sourceType: "MANUAL",
      sourceReference: context.id, cancelledAt: null,
      AND: [
        { sourceSnapshot: { path: ["inventoryUnitId"], equals: context.id } },
        { vehicleSnapshot: { path: ["vehicleId"], equals: context.vehicle.id } },
        { OR: [{ bookingStatus: "DRAFT" }, { startsAt: { gte: new Date() } }] }
      ],
      OR: [{ ownerUserId: actor.id }, { createdByUserId: actor.id }]
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: { appointmentNumber: true, bookingStatus: true, startsAt: true },
    take: 5
  });
}
