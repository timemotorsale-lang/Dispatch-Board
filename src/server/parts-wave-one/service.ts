import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { normalizeBarcodeAlias, normalizeCycleCountAction, normalizeCycleCountCreate, normalizeCycleCountLine, normalizeInventoryPolicy, normalizeRecommendationDecision, normalizeRecommendationRun } from "./domain";
import { createPartsWaveOneRepository, type PartsWaveOneRepository } from "./repository";

type Dependencies = { enforceRollout?: boolean; foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: PartsWaveOneRepository };

function dependencies(input: Dependencies) {
  return { enforceRollout: input.enforceRollout ?? true, foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createPartsWaveOneRepository() };
}

async function authorize(actor: AuthenticatedUser | null, manage: boolean, locationId: string | null, context: ReturnType<typeof dependencies>) {
  const user = assertAuthenticatedUser(actor), grants = await context.foundationRepository.listCapabilityGrants(user.id, context.organizationId);
  assertVehicleCapability({ actor: user, capability: manage ? "PARTS_MANAGE" : "PARTS_VIEW", grants, locationId, now: context.now() });
  if (manage && context.enforceRollout) {
    const flags = await context.foundationRepository.listFeatureFlags(context.organizationId), decision = evaluateVehicleOperationsFeature(flags, "PARTS_OPERATIONS", user.id, locationId);
    if (!decision.executable) throw new Error(`Parts Operations mutations are not enabled (${decision.reason}).`);
  }
  return user;
}

function command(input: { actorUserId: string; commandType: string; expectedVersion?: number; idempotencyKey: string; locationId?: string | null; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string; subjectType: string }) {
  return normalizeEnterpriseCommand({ ...input, domain: "PARTS_OPERATIONS", expectedVersion: input.expectedVersion ?? 0, locationId: input.locationId ?? null });
}

function payload(value: unknown) { return JSON.parse(JSON.stringify(value)) as Record<string, unknown>; }

export async function getPartsWaveOneWorkspace(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const context = dependencies(input);
  await authorize(actor, false, null, context);
  return context.repository.overview(context.organizationId);
}

export async function executePartsWaveOneCommand(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Parts Operations request must be an object.");
  const raw = value as Record<string, unknown>, action = typeof raw.action === "string" ? raw.action.trim().toUpperCase() : "", subjectId = typeof raw.subjectId === "string" ? raw.subjectId.trim() : "", context = dependencies(input), view = await context.repository.overview(context.organizationId);
  if (!action) throw new Error("Action is required.");
  const count = view.counts.find((item) => item.id === subjectId), recommendation = view.recommendations.find((item) => item.id === subjectId);
  let locationId: string | null = count?.stockLocation.locationId ?? null;
  if (action === "CREATE_CYCLE_COUNT" || action === "CREATE_INVENTORY_POLICY") {
    const stockLocationId = typeof raw.stockLocationId === "string" ? raw.stockLocationId : "";
    locationId = view.stockLocations.find((item) => item.id === stockLocationId)?.locationId ?? null;
  } else if (action === "GENERATE_INVENTORY_RECOMMENDATIONS") locationId = typeof raw.locationId === "string" && raw.locationId ? raw.locationId : null;
  else if (recommendation) locationId = view.stockLocations.find((item) => item.id === recommendation.stockLocationId)?.locationId ?? null;
  const user = await authorize(actor, true, locationId, context), id = randomUUID();

  if (action === "CREATE_CYCLE_COUNT") {
    const data = normalizeCycleCountCreate(raw);
    const snapshotAt = context.now();
    return context.repository.createCycleCount(command({ actorUserId: user.id, commandType: action, idempotencyKey: data.idempotencyKey, locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_CYCLE_COUNT" }), { ...data, createdByUserId: user.id, ledgerCutoffAt: snapshotAt, snapshotAt });
  }
  if (["START_CYCLE_COUNT", "CANCEL_CYCLE_COUNT", "SUBMIT_CYCLE_COUNT", "APPROVE_CYCLE_COUNT", "POST_CYCLE_COUNT"].includes(action)) {
    if (!count) throw new Error("Cycle count was not found.");
    const data = normalizeCycleCountAction(raw), version = await context.repository.aggregateVersion(context.organizationId, "PART_CYCLE_COUNT", count.id), enterprise = command({ actorUserId: user.id, commandType: action, expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: count.id, subjectType: "PART_CYCLE_COUNT" });
    if (action === "START_CYCLE_COUNT") return context.repository.transitionCycleCount(enterprise, count.id, { ...data, actorUserId: user.id, toStatus: "COUNTING" });
    if (action === "CANCEL_CYCLE_COUNT") return context.repository.transitionCycleCount(enterprise, count.id, { ...data, actorUserId: user.id, toStatus: "CANCELLED" });
    if (action === "SUBMIT_CYCLE_COUNT") return context.repository.submitCycleCount(enterprise, count.id, { ...data, actorUserId: user.id });
    if (action === "APPROVE_CYCLE_COUNT") return context.repository.approveCycleCount(enterprise, count.id, { ...data, actorUserId: user.id });
    return context.repository.postCycleCount(enterprise, count.id, { ...data, actorUserId: user.id });
  }
  if (action === "RECORD_CYCLE_COUNT_LINE") {
    if (!count) throw new Error("Cycle count was not found.");
    const data = normalizeCycleCountLine(raw), version = await context.repository.aggregateVersion(context.organizationId, "PART_CYCLE_COUNT", count.id);
    return context.repository.recordCycleCountLine(command({ actorUserId: user.id, commandType: action, expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: count.id, subjectType: "PART_CYCLE_COUNT" }), count.id, { ...data, actorUserId: user.id });
  }
  if (action === "CREATE_INVENTORY_POLICY") {
    const data = normalizeInventoryPolicy(raw);
    return context.repository.createInventoryPolicy(command({ actorUserId: user.id, commandType: action, idempotencyKey: data.idempotencyKey, locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_INVENTORY_POLICY" }), { ...data, createdByUserId: user.id });
  }
  if (action === "GENERATE_INVENTORY_RECOMMENDATIONS") {
    const data = normalizeRecommendationRun(raw);
    return context.repository.generateRecommendations(command({ actorUserId: user.id, commandType: action, idempotencyKey: data.idempotencyKey, locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_RECOMMENDATION_RUN" }), { ...data, generatedByUserId: user.id });
  }
  if (action === "DECIDE_INVENTORY_RECOMMENDATION") {
    if (!recommendation) throw new Error("Inventory recommendation was not found.");
    const data = normalizeRecommendationDecision(raw), version = await context.repository.aggregateVersion(context.organizationId, "PART_INVENTORY_RECOMMENDATION", recommendation.id);
    return context.repository.decideRecommendation(command({ actorUserId: user.id, commandType: action, expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: recommendation.id, subjectType: "PART_INVENTORY_RECOMMENDATION" }), recommendation.id, { ...data, actorUserId: user.id });
  }
  if (action === "CREATE_PART_BARCODE_ALIAS") {
    const data = normalizeBarcodeAlias(raw);
    return context.repository.createBarcodeAlias(command({ actorUserId: user.id, commandType: action, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_BARCODE_ALIAS" }), { ...data, createdByUserId: user.id });
  }
  throw new Error("Wave 1 Parts Operations action is not supported.");
}
