import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import type { Prisma } from "@prisma/client";

/** Call after the viewer has been authorized to read this vehicle or its repair order. */
export async function isCustomerOwnedForInventoryLifecycle(vehicleId: string, organizationId: string = INITIAL_ORGANIZATION.id, database: Pick<Prisma.TransactionClient, "vehicleRelationship" | "inventoryUnit" | "repairOrder" | "customerVehicle"> = prisma) {
  const now = new Date();
  const [relationship, inventory, lastOrder, legacyOwner] = await Promise.all([
    database.vehicleRelationship.findFirst({
      where: {
        vehicleId, organizationId, effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        relationshipType: { in: ["CUSTOMER_OWNER", "SOLD_TO_CUSTOMER", "DEALERSHIP_OWNED", "TRADE_IN"] },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      select: { relationshipType: true, effectiveFrom: true },
    }),
    database.inventoryUnit.findFirst({
      where: {
        vehicleId, organizationId, closedAt: null, operatingState: { not: "CLOSED" },
        lifecycleStage: { notIn: ["SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] },
      },
      orderBy: { financialAcquiredAt: "desc" },
      select: { financialAcquiredAt: true },
    }),
    database.repairOrder.findFirst({
      where: { vehicleId, organizationId },
      orderBy: { openedAt: "desc" },
      select: { origin: true },
    }),
    database.customerVehicle.findFirst({
      where: {
        vehicleId, customer: { organizationId }, relationshipType: { in: ["OWNER", "CUSTOMER_OWNER", "SOLD_TO_CUSTOMER"] },
        effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
      select: { effectiveFrom: true },
    }),
  ]);
  if (relationship) {
    const customer = relationship.relationshipType === "CUSTOMER_OWNER" || relationship.relationshipType === "SOLD_TO_CUSTOMER";
    return customer && (!inventory || relationship.effectiveFrom >= inventory.financialAcquiredAt);
  }
  if (legacyOwner) return !inventory || legacyOwner.effectiveFrom >= inventory.financialAcquiredAt;
  return !inventory && lastOrder?.origin === "CUSTOMER_REPAIR";
}
