import { randomUUID } from "node:crypto";
import { InventoryUnitLifecycleStage, InventoryUnitOperatingState } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { hashEnterpriseCommand, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { describeVehicleOperationsBlock, evaluateVehicleOperationsFeature, type VehicleOperationsFeatureCode } from "@/server/enterprise-command/service";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { inventoryUnitAge, normalizeInventoryUnitControlUpdate, normalizeInventoryUnitCreate } from "./domain";
import { createInventoryUnitRepository, type InventoryUnitRepository } from "./repository";
import { normalizeCostRecord, summarizeRecordedCosts } from "./cost-domain";
import { normalizePricing, comparePricing } from "./pricing-domain";
import { assertPricingAccess } from "./pricing-access";

type Dependencies = { enforceRollout?: boolean; foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: InventoryUnitRepository };
function deps(input: Dependencies) { return { enforceRollout: input.enforceRollout ?? true, foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createInventoryUnitRepository() }; }
async function authorize(actor: AuthenticatedUser | null, capability: VehicleCapability, locationId: string | null, input: ReturnType<typeof deps>, mutation = false, amountCents?: number, feature: VehicleOperationsFeatureCode = "RETAIL_INVENTORY") {
  const user = assertAuthenticatedUser(actor); const grants = await input.foundationRepository.listCapabilityGrants(user.id, input.organizationId);
  const access = { actor: user, grants, locationId, amountCents, now: input.now() };
  if (capability === "INVENTORY_PRICING_MANAGE") assertPricingAccess(access);
  else assertVehicleCapability({ ...access, capability });
  if (mutation && input.enforceRollout) { const flags = await input.foundationRepository.listFeatureFlags(input.organizationId); const decision = evaluateVehicleOperationsFeature(flags, feature, user.id, locationId); if (!decision.executable) throw new Error(`${feature === "INVENTORY_INTAKE" ? "Acquisition intake writes" : "Retail inventory mutations"} are not enabled. ${describeVehicleOperationsBlock(decision.reason)}`); }
  return user;
}
function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; locationId: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string }) { return normalizeEnterpriseCommand({ ...input, domain: "RETAIL_INVENTORY", subjectType: "INVENTORY_UNIT" }); }

export async function getVehicleCosts(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies = {}) {
  const context = deps(input);
  await authorize(actor, "INVENTORY_COST_VIEW", null, context);
  const unit = await context.repository.getCostDetail(context.organizationId, vehicleId);
  if (!unit) return null;
  await authorize(actor, "INVENTORY_COST_VIEW", unit.locationId, context);
  return { ...unit, summary: summarizeRecordedCosts(unit.costEntries) };
}

export async function getVehiclePricing(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies = {}) {
  const context = deps(input);
  await authorize(actor, "INVENTORY_PRICING_MANAGE", null, context);
  const unit = await context.repository.getPricingDetail(context.organizationId, vehicleId);
  if (!unit) return null;
  await authorize(actor, "INVENTORY_PRICING_MANAGE", unit.locationId, context);
  const latest = unit.pricingProposals[0] ?? null;
  const intakeDetails = unit.intakeRevisions?.[0]?.details;
  const intakePrice = intakeDetails && typeof intakeDetails === "object" && !Array.isArray(intakeDetails) ? intakeDetails.proposedPriceCents : null;
  return { id: unit.id, vehicleId, inventoryNumber: unit.inventoryNumber, version: unit.version, vehicle: unit.vehicle, latest, intakePriceCents: typeof intakePrice === "number" ? intakePrice : null, history: unit.pricingProposals.slice(0, 50), hasMoreHistory: unit.pricingProposals.length > 50, costs: summarizeRecordedCosts(unit.costEntries), costsKnown: comparePricing(unit.costEntries, { priceCents: 1, packCents: 0, includeEstimates: false, marginMode: "OFF", threshold: null }).known, comparison: latest ? comparePricing(unit.costEntries, latest) : null, stale: latest ? latest.inventoryVersion !== unit.version : false };
}

export async function saveVehiclePricing(actor: AuthenticatedUser | null, id: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input);
  await authorize(actor, "INVENTORY_PRICING_MANAGE", null, context);
  const data = normalizePricing(value);
  const unit = await context.repository.getDetail(context.organizationId, id);
  if (!unit) throw new Error("Inventory unit was not found.");
  const user = await authorize(actor, "INVENTORY_PRICING_MANAGE", unit.locationId, context, true, data.priceCents);
  return context.repository.savePricing(command({ actorUserId: user.id, commandType: "SAVE_INVENTORY_PRICING", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, locationId: unit.locationId, organizationId: context.organizationId, payload: { ...data }, reason: data.reason, subjectId: id }), data);
}

export async function recordInventoryCost(actor: AuthenticatedUser | null, id: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input);
  const user = assertAuthenticatedUser(actor);
  const unit = await context.repository.getDetail(context.organizationId, id);
  if (!unit) throw new Error("Inventory unit was not found.");
  const normalized = normalizeCostRecord(value, context.now());
  await authorize(user, normalized.action === "RECORD_COST" && normalized.category === "ACQUISITION" ? "INVENTORY_ACQUISITION_MANAGE" : "INVENTORY_RECON_MANAGE", unit.locationId, context, true, normalized.action === "RECORD_COST" ? normalized.amountCents : undefined);
  const payload = normalized.action === "RECORD_COST" ? { ...normalized, observedAt: normalized.observedAt.toISOString() } : { ...normalized };
  return context.repository.recordCost(command({ actorUserId: user.id, commandType: normalized.action === "RECORD_COST" ? "RECORD_INVENTORY_COST" : "VOID_INVENTORY_COST", expectedVersion: normalized.expectedVersion, idempotencyKey: normalized.idempotencyKey, locationId: unit.locationId, organizationId: context.organizationId, payload, reason: normalized.reason, subjectId: id }), normalized);
}

export type InventoryUnitSearchQuery = { page?: unknown; pageSize?: unknown; query?: unknown; stage?: unknown; state?: unknown; locationId?: unknown; overdue?: unknown; sort?: unknown };
export async function listInventoryUnits(actor: AuthenticatedUser | null, query: InventoryUnitSearchQuery, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "INVENTORY_UNIT_VIEW", null, context);
  const integer = (value: unknown, fallback: number, maximum: number) => {
    if (value == null || value === "") return fallback;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > maximum) throw new Error("Inventory pagination is invalid.");
    return number;
  };
  const enumFilter = <T extends string>(value: unknown, values: readonly T[], label: string): T | undefined => {
    if (value == null || value === "") return undefined;
    if (!values.includes(value as T)) throw new Error(`Inventory ${label} filter is invalid.`);
    return value as T;
  };
  const now = context.now();
  const filters = {
    query: typeof query.query === "string" ? query.query.trim().slice(0, 500) : "",
    stage: enumFilter(query.stage, Object.values(InventoryUnitLifecycleStage), "stage"),
    state: enumFilter(query.state, Object.values(InventoryUnitOperatingState), "state"),
    locationId: typeof query.locationId === "string" && query.locationId.trim() ? query.locationId.trim() : undefined,
    overdue: query.overdue === true || query.overdue === "true",
    sort: enumFilter(query.sort, ["target", "location"] as const, "sort") ?? "target"
  };
  const overdueValues: readonly unknown[] = [undefined, null, "", false, true, "false", "true"];
  if (!overdueValues.includes(query.overdue)) throw new Error("Inventory overdue filter is invalid.");
  const result = await context.repository.search(context.organizationId, { ...filters, page: integer(query.page, 1, 1_000_000), pageSize: integer(query.pageSize, 25, 100), now });
  return { ...result, filters, items: result.items.map((item) => ({ ...item, age: inventoryUnitAge({ financialAcquiredAt: item.financialAcquiredAt, now, stageStartedAt: item.stageStartedAt, targetAt: item.targetAt }) })) };
}

export async function getInventoryUnitDetail(actor: AuthenticatedUser | null, id: string, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "INVENTORY_UNIT_VIEW", null, context); const unit = await context.repository.getDetail(context.organizationId, id); if (!unit) throw new Error("Inventory unit was not found."); return { ...unit, age: inventoryUnitAge({ financialAcquiredAt: unit.financialAcquiredAt, now: context.now(), stageStartedAt: unit.stageStartedAt, targetAt: unit.targetAt }) };
}

export async function getInventoryUnitCreateOptions(actor: AuthenticatedUser | null, input: Dependencies = {}) { const context = deps(input); await authorize(actor, "INVENTORY_UNIT_VIEW", null, context); return context.repository.getCreateOptions(context.organizationId); }

export async function createInventoryUnit(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const workflow = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).workflow : undefined;
  if (workflow !== undefined && workflow !== "ACQUISITION_INTAKE") throw new Error("Inventory creation workflow is invalid.");
  const intakeDraftRequired = workflow === "ACQUISITION_INTAKE";
  const context = deps(input); const normalized = normalizeInventoryUnitCreate(value, context.now()); const user = await authorize(actor, "INVENTORY_ACQUISITION_MANAGE", normalized.locationId, context, true, undefined, intakeDraftRequired ? "INVENTORY_INTAKE" : "RETAIL_INVENTORY"); const id = randomUUID();
  const payload = { acquisitionSource: normalized.acquisitionSource, financialAcquiredAt: normalized.financialAcquiredAt.toISOString(), inventoryNumber: normalized.inventoryNumber, lifecycleStage: normalized.lifecycleStage, locationId: normalized.locationId, nextAction: normalized.nextAction, operatingState: normalized.operatingState, ownerUserId: normalized.ownerUserId, stateReason: normalized.stateReason, targetAt: normalized.targetAt.toISOString(), vehicleId: normalized.vehicleId, ...(intakeDraftRequired ? { workflow } : {}) };
  const createCommand = command({ actorUserId: user.id, commandType: "CREATE_INVENTORY_UNIT", expectedVersion: 0, idempotencyKey: normalized.idempotencyKey, locationId: normalized.locationId, organizationId: context.organizationId, payload, reason: normalized.reason, subjectId: id });
  // Keep command identity and caller input stable while allocating the new unit ID.
  createCommand.requestHash = hashEnterpriseCommand({ actorUserId: user.id, commandType: createCommand.commandType, domain: createCommand.domain, organizationId: context.organizationId, locationId: normalized.locationId, payload, reason: createCommand.reason });
  return context.repository.create(createCommand, { acquisitionSource: normalized.acquisitionSource, actorUserId: user.id, financialAcquiredAt: normalized.financialAcquiredAt, inventoryNumber: normalized.inventoryNumber, locationId: normalized.locationId, nextAction: normalized.nextAction, operatingState: normalized.operatingState, ownerUserId: normalized.ownerUserId, stateReason: normalized.stateReason, targetAt: normalized.targetAt, vehicleId: normalized.vehicleId, ...(intakeDraftRequired ? { intakeDraftRequired: true } : {}) });
}

export async function updateInventoryUnitControl(actor: AuthenticatedUser | null, id: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const normalized = normalizeInventoryUnitControlUpdate(value); const user = await authorize(actor, "INVENTORY_RECON_MANAGE", normalized.locationId, context, true);
  const payload = { locationId: normalized.locationId, nextAction: normalized.nextAction, operatingState: normalized.operatingState, ownerUserId: normalized.ownerUserId, stateReason: normalized.stateReason, targetAt: normalized.targetAt.toISOString() };
  return context.repository.updateControl(command({ actorUserId: user.id, commandType: "UPDATE_INVENTORY_UNIT_CONTROL", expectedVersion: normalized.expectedVersion, idempotencyKey: normalized.idempotencyKey, locationId: normalized.locationId, organizationId: context.organizationId, payload, reason: normalized.reason, subjectId: id }), { actorUserId: user.id, locationId: normalized.locationId, nextAction: normalized.nextAction, operatingState: normalized.operatingState, ownerUserId: normalized.ownerUserId, stateReason: normalized.stateReason, targetAt: normalized.targetAt });
}
