import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { buildCapitalComposition, buildCrossLaneDependencies, buildLifecycleHealth, buildLifecycleStageFlow, type CostFact, type LifecycleEventFact, type RepairDependencyFact } from "./lifecycle-projections";

type Dependencies = { organizationId?: string; now?: () => Date; foundationRepository?: ReturnType<typeof createEnterpriseCommandRepository> };
export const inventoryLifecycleStages = ["PURCHASED_OR_TRADE_IN", "TRANSPORTATION", "RECEIVED", "INSPECTION", "RECONDITIONING", "TITLE_DOCUMENT_READINESS", "PHOTOGRAPHY_MERCHANDISING", "FRONTLINE_READY", "RESERVED_DEAL_PENDING", "SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] as const;
export type InventoryLifecycleStage = (typeof inventoryLifecycleStages)[number];

export type InventoryControlTowerSourceUnit = {
  id: string; inventoryNumber: string; lifecycleStage: InventoryLifecycleStage; operatingState: string;
  targetAt: Date; stageStartedAt: Date; financialAcquiredAt: Date; nextAction: string; stateReason: string | null; locationId: string;
  location: { code: string; name: string };
  vehicle: { id: string; vehicleNumber: string; stockNumber: string | null; year: number | null; make: string | null; model: string | null; vin: string | null };
  ownerUser: { id: string; name: string };
  costEntries: Array<{ amountCents: number; currency: string; status: string; category?: string; confidence?: string }>;
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
  const units = await prisma.inventoryUnit.findMany({ where: { organizationId: context.organizationId, closedAt: null, ...(stage ? { lifecycleStage: stage } : {}), ...(locationId ? { locationId } : {}) }, select: { id: true, inventoryNumber: true, lifecycleStage: true, operatingState: true, targetAt: true, stageStartedAt: true, financialAcquiredAt: true, nextAction: true, stateReason: true, locationId: true, location: { select: { code: true, name: true } }, vehicle: { select: { id: true, vehicleNumber: true, stockNumber: true, year: true, make: true, model: true, vin: true } }, ownerUser: { select: { id: true, name: true } }, costEntries: { select: { amountCents: true, currency: true, status: true, category: true, confidence: true } } }, orderBy: [{ targetAt: "asc" }, { inventoryNumber: "asc" }] });
  const base = buildInventoryControlTowerProjection(units as InventoryControlTowerSourceUnit[], context.now(), { stage, locationId, inventoryUnitId }), unitIds = units.map((unit) => unit.id), selectedId = base.selectedAsset?.id ?? null, manager = isManager(context.user);
  const [events, repairOrders, excludedCustomerRepairs, frontline, retail, dispositions, checkpoints, conflicts, deadLetters, tasks, audits, commands] = await Promise.all([
    unitIds.length ? prisma.inventoryUnitStateEvent.findMany({ where: { organizationId: context.organizationId, inventoryUnitId: { in: unitIds } }, select: { inventoryUnitId: true, fromStage: true, toStage: true, occurredAt: true }, orderBy: { occurredAt: "asc" } }) : Promise.resolve([]),
    unitIds.length ? prisma.repairOrder.findMany({ where: { organizationId: context.organizationId, inventoryUnitId: { in: unitIds } }, select: { id: true, inventoryUnitId: true, origin: true, operatingState: true, stage: true, partDemands: { select: { quantityRequired: true, quantityReserved: true, status: true, requiredAt: true, requisitions: { select: { selectedOffer: { select: { estimatedArrivalAt: true } } } } } }, repairJobs: { select: { status: true } } } }) : Promise.resolve([]),
    prisma.repairOrder.count({ where: { organizationId: context.organizationId, origin: "CUSTOMER_REPAIR", closedAt: null, ...(locationId ? { locationId } : {}) } }),
    unitIds.length ? prisma.inventoryFrontlineWorkflow.findMany({ where: { organizationId: context.organizationId, inventoryUnitId: { in: unitIds } }, select: { id: true, inventoryUnitId: true, stage: true, operatingState: true, version: true, targetAt: true, nextAction: true, releaseSnapshot: true } }) : Promise.resolve([]),
    unitIds.length ? prisma.inventoryRetailCompletion.findMany({ where: { organizationId: context.organizationId, inventoryUnitId: { in: unitIds } }, select: { id: true, inventoryUnitId: true, stage: true, operatingState: true, version: true, targetAt: true, nextAction: true, saleAuthorizationSnapshot: true } }) : Promise.resolve([]),
    unitIds.length ? prisma.inventoryDispositionCase.findMany({ where: { organizationId: context.organizationId, inventoryUnitId: { in: unitIds } }, select: { id: true, inventoryUnitId: true, stage: true, operatingState: true, version: true, targetAt: true, expiresAt: true, nextAction: true, recommendationSnapshot: true, approvalSnapshot: true, completionSnapshot: true } }) : Promise.resolve([]),
    prisma.enterpriseProjectionCheckpoint.findMany({ where: { organizationId: context.organizationId, ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}) }, select: { projectionCode: true, lagSeconds: true, lastFailureAt: true, lastError: true } }),
    prisma.enterpriseIntegrationConflict.findMany({ where: { organizationId: context.organizationId, status: { in: ["OPEN", "INVESTIGATING"] }, ...(unitIds.length ? { OR: [{ entityId: { in: unitIds } }, { entityType: { in: ["INVENTORY_UNIT", "REPAIR_ORDER"] } }] } : {}) }, select: { id: true, systemCode: true, summary: true, ownerUserId: true }, take: 50, orderBy: { detectedAt: "desc" } }),
    prisma.enterpriseOutboxMessage.count({ where: { organizationId: context.organizationId, status: "DEAD_LETTER", ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}) } }),
    selectedId ? prisma.task.findMany({ where: { vehicleId: units.find((unit) => unit.id === selectedId)?.vehicle.id, status: { not: "COMPLETED" }, ...(manager ? {} : { assignedUserId: context.user.id }) }, select: { id: true, title: true, status: true, dueAt: true, assignedUser: { select: { name: true } } }, take: 20, orderBy: { dueAt: "asc" } }) : Promise.resolve([]),
    selectedId && manager ? prisma.enterpriseAuditEvent.findMany({ where: { organizationId: context.organizationId, subjectId: selectedId }, select: { id: true, eventType: true, reason: true, occurredAt: true, correlationId: true }, take: 20, orderBy: { occurredAt: "desc" } }) : Promise.resolve([]),
    selectedId && manager ? prisma.enterpriseCommandLedger.findMany({ where: { organizationId: context.organizationId, subjectId: selectedId }, select: { id: true, commandType: true, status: true, resultingVersion: true, createdAt: true, correlationId: true }, take: 20, orderBy: { createdAt: "desc" } }) : Promise.resolve([])
  ]);
  const stageFlow = buildLifecycleStageFlow(inventoryLifecycleStages, units.map((unit) => ({ id: unit.id, lifecycleStage: unit.lifecycleStage, stageStartedAt: unit.stageStartedAt, operatingState: unit.operatingState, targetAt: unit.targetAt, exposureCents: unit.costEntries.reduce((sum, cost) => sum + (cost.status === "VOID" || cost.currency !== "USD" ? 0 : cost.amountCents), 0), ownerUserId: unit.ownerUser.id })), events as LifecycleEventFact[], context.now());
  const crossLane = buildCrossLaneDependencies(repairOrders as RepairDependencyFact[], excludedCustomerRepairs), capital = buildCapitalComposition(units.flatMap((unit) => unit.costEntries) as CostFact[]), health = buildLifecycleHealth({ checkpoints, conflicts, deadLetters });
  const decisionItems = [
    ...frontline.map((item) => ({ id: item.id, inventoryUnitId: item.inventoryUnitId, domain: "FRONTLINE", kind: item.stage === "FRONTLINE_RELEASE_REVIEW" ? "APPROVAL" : "WORKFLOW", state: item.stage, version: item.version, targetAt: item.targetAt, expiresAt: null, nextAction: item.nextAction, recommendation: null, decision: manager ? item.releaseSnapshot : { restricted: true } })),
    ...retail.map((item) => ({ id: item.id, inventoryUnitId: item.inventoryUnitId, domain: "RETAIL", kind: item.stage === "SALE_AUTHORIZATION" ? "APPROVAL" : "WORKFLOW", state: item.stage, version: item.version, targetAt: item.targetAt, expiresAt: null, nextAction: item.nextAction, recommendation: null, decision: manager ? item.saleAuthorizationSnapshot : { restricted: true } })),
    ...dispositions.map((item) => ({ id: item.id, inventoryUnitId: item.inventoryUnitId, domain: "DISPOSITION", kind: item.stage === "APPROVAL" ? "APPROVAL" : "RECOMMENDATION", state: item.stage, version: item.version, targetAt: item.targetAt, expiresAt: item.expiresAt, nextAction: item.nextAction, recommendation: manager ? item.recommendationSnapshot : { restricted: true }, decision: manager ? Object.keys(item.approvalSnapshot as object).length ? item.approvalSnapshot : item.completionSnapshot : { restricted: true } }))
  ];
  const decisions = { status: "CONNECTED" as const, approvals: decisionItems.filter((item) => item.kind === "APPROVAL").length, recommendations: decisionItems.filter((item) => item.kind === "RECOMMENDATION").length, expired: decisionItems.filter((item) => item.expiresAt && item.expiresAt < context.now()).length, items: decisionItems };
  const selectedRepairOrders = selectedId ? repairOrders.filter((order) => order.inventoryUnitId === selectedId) : [], selectedDecisions = selectedId ? decisionItems.filter((item) => item.inventoryUnitId === selectedId) : [];
  const selectedContext = selectedId ? { inventoryUnitId: selectedId, repairOrders: selectedRepairOrders, parts: { openDemands: selectedRepairOrders.flatMap((order) => order.partDemands).filter((item) => ["OPEN", "PARTIALLY_RESERVED"].includes(item.status)).length, unreservedUnits: selectedRepairOrders.flatMap((order) => order.partDemands).reduce((sum, item) => sum + Math.max(0, item.quantityRequired - item.quantityReserved), 0) }, tasks, decisions: selectedDecisions, auditEvents: audits, commands, validCommands: ["Open Inventory Unit", ...(selectedRepairOrders.length ? ["Open Shop & Recon", "Open Parts Operations"] : []), ...(selectedDecisions.length ? ["Open Reviews & Approvals"] : [])], fieldRestrictions: ["VIN and evidence access remain capability-filtered.", manager ? "Manager audit and command history is visible." : "Decision payloads, audit history, and command history require manager authority.", "This projection cannot execute generic lifecycle transitions."] } : null;
  const connectedReasons = [...base.partialReasons, ...(health.status === "ATTENTION" ? ["Lifecycle health has open conflicts, dead letters, or lagging projections."] : [])];
  return { ...base, contractVersion: "r3.2", projectionVersion: "inventory-lifecycle-connected-v1", freshness: connectedReasons.length ? "PARTIAL" as const : "COMPLETE" as const, dataQualityGrade: connectedReasons.length ? "B" as const : "A" as const, partialReasons: connectedReasons, stageFlow, crossLane, decisions, capital, selectedContext, health, dependentSources: { shopRecon: { status: "CONNECTED" as const, reason: `${crossLane.activeOrders} active inventory-recon RepairOrders.` }, parts: { status: "CONNECTED" as const, reason: `${crossLane.waitingPartDemands} unresolved Parts demands.` }, reviewsApprovals: { status: "CONNECTED" as const, reason: `${decisions.approvals} governed approvals in scope.` }, recommendations: { status: "CONNECTED" as const, reason: `${decisions.recommendations} governed disposition recommendations in scope.` } } };
}

export type InventoryControlTowerProjection = Awaited<ReturnType<typeof getInventoryControlTowerProjection>>;
export type InventoryControlTowerBaseProjection = ReturnType<typeof buildInventoryControlTowerProjection>;
