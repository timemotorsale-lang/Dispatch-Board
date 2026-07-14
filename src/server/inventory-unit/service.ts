import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { inventoryUnitAge, normalizeInventoryUnitControlUpdate, normalizeInventoryUnitCreate } from "./domain";
import { createInventoryUnitRepository, type InventoryUnitRepository } from "./repository";

type Dependencies = { enforceRollout?: boolean; foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: InventoryUnitRepository };
function deps(input: Dependencies) { return { enforceRollout: input.enforceRollout ?? true, foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createInventoryUnitRepository() }; }
async function authorize(actor: AuthenticatedUser | null, capability: VehicleCapability, locationId: string | null, input: ReturnType<typeof deps>, mutation = false) {
  const user = assertAuthenticatedUser(actor); const grants = await input.foundationRepository.listCapabilityGrants(user.id, input.organizationId); assertVehicleCapability({ actor: user, capability, grants, locationId, now: input.now() });
  if (mutation && input.enforceRollout) { const flags = await input.foundationRepository.listFeatureFlags(input.organizationId); const decision = evaluateVehicleOperationsFeature(flags, "RETAIL_INVENTORY", user.id, locationId); if (!decision.executable) throw new Error(`Retail inventory mutations are not enabled (${decision.reason}).`); }
  return user;
}
function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; locationId: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string }) { return normalizeEnterpriseCommand({ ...input, domain: "RETAIL_INVENTORY", subjectType: "INVENTORY_UNIT" }); }

export async function listInventoryUnits(actor: AuthenticatedUser | null, query: { page?: unknown; pageSize?: unknown; query?: unknown; stage?: unknown; state?: unknown }, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "INVENTORY_UNIT_VIEW", null, context); const page = Math.max(1, Number(query.page) || 1); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
  const result = await context.repository.search(context.organizationId, { page, pageSize, query: typeof query.query === "string" ? query.query : "", stage: typeof query.stage === "string" ? query.stage : undefined, state: typeof query.state === "string" ? query.state : undefined }); const now = context.now();
  return { ...result, items: result.items.map((item) => ({ ...item, age: inventoryUnitAge({ financialAcquiredAt: item.financialAcquiredAt, now, stageStartedAt: item.stageStartedAt, targetAt: item.targetAt }) })) };
}

export async function getInventoryUnitDetail(actor: AuthenticatedUser | null, id: string, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "INVENTORY_UNIT_VIEW", null, context); const unit = await context.repository.getDetail(context.organizationId, id); if (!unit) throw new Error("Inventory unit was not found."); return { ...unit, age: inventoryUnitAge({ financialAcquiredAt: unit.financialAcquiredAt, now: context.now(), stageStartedAt: unit.stageStartedAt, targetAt: unit.targetAt }) };
}

export async function getInventoryUnitCreateOptions(actor: AuthenticatedUser | null, input: Dependencies = {}) { const context = deps(input); await authorize(actor, "INVENTORY_UNIT_VIEW", null, context); return context.repository.getCreateOptions(context.organizationId, context.now()); }

export async function createInventoryUnit(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const normalized = normalizeInventoryUnitCreate(value, context.now()); const user = await authorize(actor, "INVENTORY_UNIT_MANAGE", normalized.locationId, context, true); const id = randomUUID();
  const payload = { financialAcquiredAt: normalized.financialAcquiredAt.toISOString(), inventoryNumber: normalized.inventoryNumber, lifecycleStage: normalized.lifecycleStage, locationId: normalized.locationId, nextAction: normalized.nextAction, operatingState: normalized.operatingState, ownerUserId: normalized.ownerUserId, stateReason: normalized.stateReason, targetAt: normalized.targetAt.toISOString(), vehicleId: normalized.vehicleId };
  return context.repository.create(command({ actorUserId: user.id, commandType: "CREATE_INVENTORY_UNIT", expectedVersion: 0, idempotencyKey: normalized.idempotencyKey, locationId: normalized.locationId, organizationId: context.organizationId, payload, reason: normalized.reason, subjectId: id }), { actorUserId: user.id, financialAcquiredAt: normalized.financialAcquiredAt, inventoryNumber: normalized.inventoryNumber, locationId: normalized.locationId, nextAction: normalized.nextAction, operatingState: normalized.operatingState, ownerUserId: normalized.ownerUserId, stateReason: normalized.stateReason, targetAt: normalized.targetAt, vehicleId: normalized.vehicleId });
}

export async function updateInventoryUnitControl(actor: AuthenticatedUser | null, id: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const normalized = normalizeInventoryUnitControlUpdate(value); const user = await authorize(actor, "INVENTORY_UNIT_MANAGE", normalized.locationId, context, true);
  const payload = { locationId: normalized.locationId, nextAction: normalized.nextAction, operatingState: normalized.operatingState, ownerUserId: normalized.ownerUserId, stateReason: normalized.stateReason, targetAt: normalized.targetAt.toISOString() };
  return context.repository.updateControl(command({ actorUserId: user.id, commandType: "UPDATE_INVENTORY_UNIT_CONTROL", expectedVersion: normalized.expectedVersion, idempotencyKey: normalized.idempotencyKey, locationId: normalized.locationId, organizationId: context.organizationId, payload, reason: normalized.reason, subjectId: id }), { actorUserId: user.id, locationId: normalized.locationId, nextAction: normalized.nextAction, operatingState: normalized.operatingState, ownerUserId: normalized.ownerUserId, stateReason: normalized.stateReason, targetAt: normalized.targetAt });
}
