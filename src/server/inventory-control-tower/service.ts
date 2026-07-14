import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { prisma } from "@/server/db/client";

type Dependencies = { organizationId?: string; now?: () => Date; foundationRepository?: ReturnType<typeof createEnterpriseCommandRepository> };
const stages = ["PURCHASED_OR_TRADE_IN", "TRANSPORTATION", "RECEIVED", "INSPECTION", "RECONDITIONING", "TITLE_DOCUMENT_READINESS", "PHOTOGRAPHY_MERCHANDISING", "FRONTLINE_READY", "RESERVED_DEAL_PENDING", "SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] as const;

async function authorize(actor: AuthenticatedUser | null, input: Dependencies) {
  const user = assertAuthenticatedUser(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const foundation = input.foundationRepository ?? createEnterpriseCommandRepository();
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, capability: "INVENTORY_UNIT_VIEW" as VehicleCapability, grants, locationId: null, now: (input.now ?? (() => new Date()))() });
  return { user, organizationId, now: input.now ?? (() => new Date()) };
}

export async function getInventoryControlTowerProjection(actor: AuthenticatedUser | null, query: { stage?: unknown; locationId?: unknown } = {}, input: Dependencies = {}) {
  const context = await authorize(actor, input);
  const stage = typeof query.stage === "string" && stages.includes(query.stage as (typeof stages)[number]) ? query.stage : undefined;
  const locationId = typeof query.locationId === "string" && query.locationId.trim() ? query.locationId : undefined;
  const where = { organizationId: context.organizationId, closedAt: null, ...(stage ? { lifecycleStage: stage as never } : {}), ...(locationId ? { locationId } : {}) };
  const units = await prisma.inventoryUnit.findMany({ where, select: { id: true, inventoryNumber: true, lifecycleStage: true, operatingState: true, targetAt: true, stageStartedAt: true, financialAcquiredAt: true, nextAction: true, stateReason: true, locationId: true, location: { select: { code: true, name: true } }, vehicle: { select: { vehicleNumber: true, stockNumber: true, year: true, make: true, model: true, vin: true } }, ownerUser: { select: { id: true, name: true } }, costEntries: { select: { amountCents: true, status: true } } }, orderBy: [{ targetAt: "asc" }, { inventoryNumber: "asc" }] });
  const now = context.now();
  const items = units.map((unit) => ({ ...unit, ageDays: Math.max(0, Math.floor((now.getTime() - unit.financialAcquiredAt.getTime()) / 86400000)), overdue: unit.targetAt < now && unit.operatingState !== "CLOSED", exposureCents: unit.costEntries.reduce((sum, cost) => sum + (cost.status === "VOID" ? 0 : cost.amountCents), 0) }));
  const byStage = Object.fromEntries(stages.map((name) => [name, { count: 0, overdue: 0, exposureCents: 0 }]));
  const byLocation: Record<string, { locationId: string; code: string; name: string; count: number; overdue: number; exposureCents: number }> = {};
  for (const item of items) { const stageSummary = byStage[item.lifecycleStage]; stageSummary.count += 1; stageSummary.overdue += item.overdue ? 1 : 0; stageSummary.exposureCents += item.exposureCents; const key = item.locationId; byLocation[key] ??= { locationId: key, code: item.location.code, name: item.location.name, count: 0, overdue: 0, exposureCents: 0 }; byLocation[key].count += 1; byLocation[key].overdue += item.overdue ? 1 : 0; byLocation[key].exposureCents += item.exposureCents; }
  return { generatedAt: now.toISOString(), freshness: "LIVE", filters: { stage: stage ?? null, locationId: locationId ?? null }, totals: { units: items.length, overdue: items.filter((item) => item.overdue).length, blocked: items.filter((item) => item.operatingState === "BLOCKED").length, waiting: items.filter((item) => item.operatingState === "WAITING").length, exposureCents: items.reduce((sum, item) => sum + item.exposureCents, 0) }, byStage, byLocation: Object.values(byLocation), items };
}
