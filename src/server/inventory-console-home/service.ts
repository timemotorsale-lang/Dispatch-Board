import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";

export type InventoryConsoleOperationalFacts = {
  shop: { active: number; blocked: number };
  parts: { waitingDemands: number; unreservedUnits: number };
  throughput: { inventoryTransitions: number; repairOrdersClosed: number; windowHours: number };
  integration: { exchanges: number; exceptions: number; status: "HEALTHY" | "ATTENTION" | "NOT_CONFIGURED"; latestAt: string | null };
};

type OperationalFactSources = { activeShop: number; blockedShop: number; demands: Array<{ quantityRequired: number; quantityReserved: number }>; inventoryTransitions: number; repairOrdersClosed: number; integrationGroups: Array<{ state: string; count: number }>; latestExchangeAt: Date | null };
export function buildInventoryConsoleOperationalFacts(source: OperationalFactSources): InventoryConsoleOperationalFacts {
  const exceptionStates = new Set(["REJECTED", "FAILED_RETRYABLE", "FAILED_FINAL", "RECONCILIATION_REQUIRED"]), exchanges = source.integrationGroups.reduce((sum, group) => sum + group.count, 0), exceptions = source.integrationGroups.reduce((sum, group) => sum + (exceptionStates.has(group.state) ? group.count : 0), 0);
  return { shop: { active: source.activeShop, blocked: source.blockedShop }, parts: { waitingDemands: source.demands.length, unreservedUnits: source.demands.reduce((sum, demand) => sum + Math.max(0, demand.quantityRequired - demand.quantityReserved), 0) }, throughput: { inventoryTransitions: source.inventoryTransitions, repairOrdersClosed: source.repairOrdersClosed, windowHours: 24 }, integration: { exchanges, exceptions, status: source.latestExchangeAt ? exceptions ? "ATTENTION" : "HEALTHY" : "NOT_CONFIGURED", latestAt: source.latestExchangeAt?.toISOString() ?? null } };
}

export async function getInventoryConsoleOperationalFacts(input: { locationId?: string | null; now?: Date; organizationId?: string } = {}): Promise<InventoryConsoleOperationalFacts> {
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id, now = input.now ?? new Date(), since = new Date(now.getTime() - 24 * 60 * 60_000), location = input.locationId ? { locationId: input.locationId } : {};
  const [activeShop, blockedShop, demands, inventoryTransitions, repairOrdersClosed, integrationGroups, latestExchange] = await Promise.all([
    prisma.repairOrder.count({ where: { organizationId, closedAt: null, ...location } }),
    prisma.repairOrder.count({ where: { organizationId, closedAt: null, operatingState: "BLOCKED", ...location } }),
    prisma.repairPartDemand.findMany({ where: { organizationId, status: { in: ["OPEN", "PARTIALLY_RESERVED"] }, ...(input.locationId ? { repairOrder: { locationId: input.locationId } } : {}) }, select: { quantityRequired: true, quantityReserved: true } }),
    prisma.inventoryUnitStateEvent.count({ where: { organizationId, occurredAt: { gte: since }, ...location } }),
    prisma.repairOrderClosureEvent.count({ where: { organizationId, occurredAt: { gte: since }, ...(input.locationId ? { repairOrder: { locationId: input.locationId } } : {}) } }),
    prisma.enterpriseIntegrationExchange.groupBy({ by: ["state"], where: { organizationId, updatedAt: { gte: since } }, _count: { _all: true } }),
    prisma.enterpriseIntegrationExchange.findFirst({ where: { organizationId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } })
  ]);
  return buildInventoryConsoleOperationalFacts({ activeShop, blockedShop, demands, inventoryTransitions, repairOrdersClosed, integrationGroups: integrationGroups.map((group) => ({ state: group.state, count: group._count._all })), latestExchangeAt: latestExchange?.updatedAt ?? null });
}
