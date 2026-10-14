import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { evaluateTitlePreparationBinding, normalizeTitlePreparationStart, normalizeTitlePreparationUpdate, TITLE_PREPARATION_CHECKS, TITLE_PREPARATION_OPERATION, TITLE_PREPARATION_POLICY_VERSION } from "./parallel-title-preparation-domain";
import { createTitlePreparationRepository } from "./parallel-title-preparation-repository";

type Repository = ReturnType<typeof createTitlePreparationRepository>;
type Dependencies = { foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: Repository };
function deps(input: Dependencies) { return { foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createTitlePreparationRepository() }; }
async function authorize(actor: AuthenticatedUser | null, locationId: string, manage: boolean, context: ReturnType<typeof deps>) {
  const user = assertAuthenticatedUser(actor), grants = await context.foundationRepository.listCapabilityGrants(user.id, context.organizationId);
  assertVehicleCapability({ actor: user, capability: manage ? "REPAIR_ORDER_MANAGE" : "REPAIR_ORDER_VIEW", grants, locationId, now: context.now() });
  return user;
}
function operationCommand(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string }) {
  return normalizeEnterpriseCommand({ ...input, domain: "SHOP_RECON", locationId: null, subjectType: "SHOP_RECON_PARALLEL_OPERATION" });
}
function view(context: Awaited<ReturnType<Repository["getContext"]>>, actor: AuthenticatedUser) {
  if (!context) return null;
  const operation = context.shopReconLifecycle?.parallelOperations[0] ?? null;
  if (!operation) return { eligible: context.origin === "INVENTORY_RECON", lifecycleInitialized: Boolean(context.shopReconLifecycle), operation: null, policyVersion: TITLE_PREPARATION_POLICY_VERSION };
  const binding = evaluateTitlePreparationBinding({ operation, current: { inventoryUnitId: context.inventoryUnit?.id ?? null, scopeVersion: context.shopReconLifecycle!.scopeVersion, vin: context.vehicle.vin, vehicleId: context.vehicle.id, workLane: context.origin } });
  return { eligible: context.origin === "INVENTORY_RECON", lifecycleInitialized: true, operation: { ...operation, ownerName: operation.ownerUserId === actor.id ? actor.name : "Assigned preparation owner", checklist: operation.checklist, evidenceReferences: operation.evidenceReferences, binding }, policyVersion: TITLE_PREPARATION_POLICY_VERSION };
}

export async function getTitlePreparation(actor: AuthenticatedUser | null, repairOrderId: string, input: Dependencies = {}) {
  const context = deps(input), order = await context.repository.getContext(context.organizationId, repairOrderId.trim());
  if (!order) throw new Error("Repair order was not found.");
  const user = await authorize(actor, order.locationId, false, context);
  return view(order, user);
}

export async function startTitlePreparation(actor: AuthenticatedUser | null, repairOrderId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeTitlePreparationStart(value), order = await context.repository.getContext(context.organizationId, repairOrderId.trim());
  if (!order) throw new Error("Repair order was not found.");
  const user = await authorize(actor, order.locationId, true, context), operationId = randomUUID();
  const result = await context.repository.create(operationCommand({ actorUserId: user.id, commandType: "START_PARALLEL_TITLE_PREPARATION", expectedVersion: 0, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: { operationCode: TITLE_PREPARATION_OPERATION, policyVersion: TITLE_PREPARATION_POLICY_VERSION, repairOrderId }, reason: data.reason, subjectId: operationId }), { ownerUserId: user.id, now: context.now(), repairOrderId });
  return { ...result, workspace: await getTitlePreparation(actor, repairOrderId, input) };
}

export async function updateTitlePreparation(actor: AuthenticatedUser | null, repairOrderId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeTitlePreparationUpdate(value), order = await context.repository.getContext(context.organizationId, repairOrderId.trim());
  if (!order?.shopReconLifecycle) throw new Error("Parallel title preparation was not found.");
  const operation = order.shopReconLifecycle.parallelOperations[0];
  if (!operation) throw new Error("Parallel title preparation was not found.");
  const user = await authorize(actor, order.locationId, true, context);
  if (user.id !== operation.ownerUserId && !isManager(user)) throw new Error("Only the preparation owner or a manager may update this parallel operation.");
  const binding = evaluateTitlePreparationBinding({ operation, current: { inventoryUnitId: order.inventoryUnit?.id ?? null, scopeVersion: order.shopReconLifecycle.scopeVersion, vin: order.vehicle.vin, vehicleId: order.vehicle.id, workLane: order.origin } });
  const base = { actorUserId: user.id, expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, reason: data.reason, subjectId: operation.id };
  if (!binding.valid) {
    const result = await context.repository.requireRevalidation(operationCommand({ ...base, commandType: "REQUIRE_PARALLEL_TITLE_REVALIDATION", payload: { reasons: binding.reasons, policyVersion: binding.policyVersion } }), binding.reasons, context.now());
    return { ...result, revalidationRequired: true, reasons: binding.reasons };
  }
  const status = data.action === "BLOCK" ? "BLOCKED" : data.action === "SUBMIT_FOR_REVIEW" ? "READY_FOR_INVENTORY_REVIEW" : "IN_PROGRESS";
  const result = await context.repository.update(operationCommand({ ...base, commandType: `${data.action}_PARALLEL_TITLE_PREPARATION`, payload: { action: data.action, checks: TITLE_PREPARATION_CHECKS.map(item => ({ code: item.code, satisfied: data.checklist[item.code] })), evidenceCount: data.evidenceReferences.length, policyVersion: TITLE_PREPARATION_POLICY_VERSION } }), data, status, context.now());
  return { ...result, workspace: await getTitlePreparation(actor, repairOrderId, input) };
}
