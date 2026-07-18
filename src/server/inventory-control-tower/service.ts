import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { prisma } from "@/server/db/client";

type Dependencies = { organizationId?: string; now?: () => Date; foundationRepository?: ReturnType<typeof createEnterpriseCommandRepository> };
export const inventoryLifecycleStages = ["PURCHASED_OR_TRADE_IN", "TRANSPORTATION", "RECEIVED", "INSPECTION", "RECONDITIONING", "TITLE_DOCUMENT_READINESS", "PHOTOGRAPHY_MERCHANDISING", "FRONTLINE_READY", "RESERVED_DEAL_PENDING", "SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] as const;
export type InventoryLifecycleStage = (typeof inventoryLifecycleStages)[number];

export type InventoryControlTowerSourceUnit = {
  id: string; inventoryNumber: string; lifecycleStage: InventoryLifecycleStage; operatingState: string;
  targetAt: Date; stageStartedAt: Date; financialAcquiredAt: Date; nextAction: string; stateReason: string | null; locationId: string;
  location: { code: string; name: string };
  vehicle: { vehicleNumber: string; stockNumber: string | null; year: number | null; make: string | null; model: string | null; vin: string | null };
  ownerUser: { id: string; name: string };
  costEntries: Array<{ amountCents: number; currency: string; status: string }>;
};

const stageLabels: Record<InventoryLifecycleStage, string> = {
  PURCHASED_OR_TRADE_IN: "Acquired", TRANSPORTATION: "In Transit", RECEIVED: "Received", INSPECTION: "Inspection",
  RECONDITIONING: "Recon", TITLE_DOCUMENT_READINESS: "Title & Documents", PHOTOGRAPHY_MERCHANDISING: "Merchandising",
  FRONTLINE_READY: "Frontline Ready", RESERVED_DEAL_PENDING: "Reserved / Deal Pending", SOLD: "Sold", DELIVERED: "Delivered",
  WHOLESALED_OR_OTHER_DISPOSITION: "Wholesale / Disposition"
};

function daysBetween(now: Date, then: Date) { return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000)); }
function average(values: number[]) { return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null; }

export function buildInventoryControlTowerProjection(units: InventoryControlTowerSourceUnit[], now: Date, filters: { stage?: InventoryLifecycleStage; locationId?: string; inventoryUnitId?: string } = {}) {
  const items = units.map((unit) => ({
    ...unit,
    ageDays: daysBetween(now, unit.financialAcquiredAt),
    stageAgeDays: daysBetween(now, unit.stageStartedAt),
    overdue: unit.targetAt < now && unit.operatingState !== "CLOSED",
    exposureCents: unit.costEntries.reduce((sum, cost) => sum + (cost.status === "VOID" || cost.currency !== "USD" ? 0 : cost.amountCents), 0)
  }));
  const byStage = inventoryLifecycleStages.map((stage) => {
    const population = items.filter((item) => item.lifecycleStage === stage);
    return { stage, label: stageLabels[stage], count: population.length, overdue: population.filter((item) => item.overdue).length, blocked: population.filter((item) => item.operatingState === "BLOCKED").length, exposureCents: population.reduce((sum, item) => sum + item.exposureCents, 0), averageStageAgeDays: average(population.map((item) => item.stageAgeDays)) };
  });
  const byLocation = Object.values(items.reduce<Record<string, { locationId: string; code: string; name: string; count: number; overdue: number; exposureCents: number }>>((result, item) => {
    const current = result[item.locationId] ?? { locationId: item.locationId, code: item.location.code, name: item.location.name, count: 0, overdue: 0, exposureCents: 0 };
    current.count += 1; current.overdue += item.overdue ? 1 : 0; current.exposureCents += item.exposureCents; result[item.locationId] = current; return result;
  }, {}));
  const agingBands = [{ key: "0_15", label: "0–15 days", minimum: 0, maximum: 15 }, { key: "16_30", label: "16–30 days", minimum: 16, maximum: 30 }, { key: "31_45", label: "31–45 days", minimum: 31, maximum: 45 }, { key: "46_60", label: "46–60 days", minimum: 46, maximum: 60 }, { key: "61_plus", label: "61+ days", minimum: 61, maximum: Number.POSITIVE_INFINITY }].map((band) => {
    const population = items.filter((item) => item.ageDays >= band.minimum && item.ageDays <= band.maximum);
    return { key: band.key, label: band.label, count: population.length, exposureCents: population.reduce((sum, item) => sum + item.exposureCents, 0) };
  });
  const priorityWork = [...items].sort((left, right) => Number(right.operatingState === "BLOCKED") - Number(left.operatingState === "BLOCKED") || Number(right.overdue) - Number(left.overdue) || left.targetAt.getTime() - right.targetAt.getTime()).slice(0, 10).map((item) => ({ id: item.id, inventoryNumber: item.inventoryNumber, vehicle: [item.vehicle.year, item.vehicle.make, item.vehicle.model].filter(Boolean).join(" ") || item.vehicle.vehicleNumber, stage: item.lifecycleStage, stageLabel: stageLabels[item.lifecycleStage], operatingState: item.operatingState, owner: item.ownerUser.name, location: item.location.name, nextAction: item.nextAction, blocker: item.stateReason, overdue: item.overdue, targetAt: item.targetAt, ageDays: item.ageDays, exposureCents: item.exposureCents }));
  const selectedAsset = items.find((item) => item.id === filters.inventoryUnitId) ?? (priorityWork.length ? items.find((item) => item.id === priorityWork[0]?.id) ?? null : null);
  const excludedCurrencyEntries = units.flatMap((unit) => unit.costEntries).filter((cost) => cost.status !== "VOID" && cost.currency !== "USD").length;
  const partialReasons = excludedCurrencyEntries ? [`${excludedCurrencyEntries} non-USD cost entries excluded; no approved conversion source is active.`] : [];
  return {
    contractVersion: "r3.1", projectionVersion: "inventory-unit-v1", generatedAt: now.toISOString(), cutoffAt: now.toISOString(), freshness: partialReasons.length ? "PARTIAL" as const : "COMPLETE" as const, dataQualityGrade: partialReasons.length ? "B" as const : "A" as const, partialReasons, reconciliation: { status: "RECONCILED" as const, scopedUnits: items.length, stageUnits: byStage.reduce((sum, stage) => sum + stage.count, 0), excludedCurrencyEntries },
    filters: { stage: filters.stage ?? null, locationId: filters.locationId ?? null, inventoryUnitId: filters.inventoryUnitId ?? null },
    totals: { units: items.length, overdue: items.filter((item) => item.overdue).length, blocked: items.filter((item) => item.operatingState === "BLOCKED").length, waiting: items.filter((item) => item.operatingState === "WAITING").length, unowned: items.filter((item) => !item.ownerUser.id).length, exposureCents: items.reduce((sum, item) => sum + item.exposureCents, 0) },
    byStage, byLocation, agingBands, priorityWork, selectedAsset, items,
    dependentSources: { shopRecon: { status: "UNAVAILABLE" as const, reason: "R3 has no reconciled RepairOrder dependency projection." }, parts: { status: "UNAVAILABLE" as const, reason: "R3 has no reconciled parts-demand dependency projection." }, reviewsApprovals: { status: "UNAVAILABLE" as const, reason: "R3 has no exact-version review and approval projection." }, recommendations: { status: "UNAVAILABLE" as const, reason: "No governed disposition recommendation model is active in R3." } }
  };
}

async function authorize(actor: AuthenticatedUser | null, input: Dependencies) {
  const user = assertAuthenticatedUser(actor); const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id; const foundation = input.foundationRepository ?? createEnterpriseCommandRepository();
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, capability: "INVENTORY_UNIT_VIEW" as VehicleCapability, grants, locationId: null, now: (input.now ?? (() => new Date()))() });
  return { user, organizationId, grants, now: input.now ?? (() => new Date()) };
}

export async function getInventoryControlTowerProjection(actor: AuthenticatedUser | null, query: { stage?: unknown; locationId?: unknown; inventoryUnitId?: unknown } = {}, input: Dependencies = {}) {
  const context = await authorize(actor, input);
  const stage = typeof query.stage === "string" && inventoryLifecycleStages.includes(query.stage as InventoryLifecycleStage) ? query.stage as InventoryLifecycleStage : undefined;
  const locationId = typeof query.locationId === "string" && query.locationId.trim() ? query.locationId : undefined;
  const inventoryUnitId = typeof query.inventoryUnitId === "string" && query.inventoryUnitId.trim() ? query.inventoryUnitId : undefined;
  if (locationId) assertVehicleCapability({ actor: context.user, capability: "INVENTORY_UNIT_VIEW" as VehicleCapability, grants: context.grants, locationId, now: context.now() });
  const units = await prisma.inventoryUnit.findMany({ where: { organizationId: context.organizationId, closedAt: null, ...(stage ? { lifecycleStage: stage } : {}), ...(locationId ? { locationId } : {}) }, select: { id: true, inventoryNumber: true, lifecycleStage: true, operatingState: true, targetAt: true, stageStartedAt: true, financialAcquiredAt: true, nextAction: true, stateReason: true, locationId: true, location: { select: { code: true, name: true } }, vehicle: { select: { vehicleNumber: true, stockNumber: true, year: true, make: true, model: true, vin: true } }, ownerUser: { select: { id: true, name: true } }, costEntries: { select: { amountCents: true, currency: true, status: true } } }, orderBy: [{ targetAt: "asc" }, { inventoryNumber: "asc" }] });
  return buildInventoryControlTowerProjection(units as InventoryControlTowerSourceUnit[], context.now(), { stage, locationId, inventoryUnitId });
}

export type InventoryControlTowerProjection = ReturnType<typeof buildInventoryControlTowerProjection>;
