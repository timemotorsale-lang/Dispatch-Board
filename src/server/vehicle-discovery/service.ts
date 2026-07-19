import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, evaluateVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { getVehicle360 } from "@/server/vehicle-360/service";
import { buildControlledVehiclePackage, normalizeControlledOutput, normalizeKnowledgeApproval, normalizeKnowledgeDraft, normalizeOperationalReturnContext, normalizeOperationalSearch, renderControlledPrint, stableControlledId, withOperationalReturnContext, type OperationalSearchType } from "./domain";
import { createVehicleDiscoveryRepository, type VehicleDiscoveryRepository } from "./repository";

type Dependencies = { now?: () => Date; organizationId?: string; repository?: VehicleDiscoveryRepository; foundationRepository?: EnterpriseCommandRepository; enforceRollout?: boolean };
function deps(input: Dependencies) { return { now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createVehicleDiscoveryRepository(), foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), enforceRollout: input.enforceRollout ?? true }; }
function required(value: unknown, label: string, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; }
function payload(value: unknown) { return JSON.parse(JSON.stringify(value)) as Record<string, unknown>; }

async function authorize(actor: AuthenticatedUser | null, capability: VehicleCapability, context: ReturnType<typeof deps>, mutation = false) {
  const user = assertAuthenticatedUser(actor), grants = await context.foundationRepository.listCapabilityGrants(user.id, context.organizationId);
  assertVehicleCapability({ actor: user, capability, grants, locationId: null, now: context.now() });
  if (mutation && context.enforceRollout) { const flags = await context.foundationRepository.listFeatureFlags(context.organizationId), decision = evaluateVehicleOperationsFeature(flags, "VEHICLE_DISCOVERY", user.id, null); if (!decision.executable) throw new Error(`Vehicle discovery mutations are not enabled (${decision.reason}).`); }
  return { grants, user };
}

function command(input: { actorUserId: string; commandType: string; domain: string; expectedVersion: number; idempotencyKey: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string; subjectType: string }) { return normalizeEnterpriseCommand({ ...input, locationId: null }); }

export async function searchVehicleOperations(actor: AuthenticatedUser | null, query: { limit?: unknown; query?: unknown; returnTo?: unknown; types?: unknown }, input: Dependencies = {}) {
  const context = deps(input), normalized = normalizeOperationalSearch(query), returnTo = normalizeOperationalReturnContext(query.returnTo), { grants, user } = await authorize(actor, "VEHICLE_DISCOVERY_VIEW", context);
  const allowed = (capability: VehicleCapability) => evaluateVehicleCapability({ actor: user, capability, grants, locationId: null, now: context.now() }).allowed;
  const capabilityByType: Record<OperationalSearchType, VehicleCapability> = { VEHICLE: "VEHICLE_OPERATIONS_VIEW", CUSTOMER: "VEHICLE_OPERATIONS_VIEW", REPAIR_ORDER: "REPAIR_ORDER_VIEW", REPAIR_JOB: "REPAIR_ORDER_VIEW", APPOINTMENT: "VEHICLE_OPERATIONS_VIEW", PART: "PARTS_VIEW", PURCHASE_ORDER: "PARTS_VIEW", DOCUMENT: "VEHICLE_EVIDENCE_VIEW", WORK_ITEM: "VEHICLE_OPERATIONS_VIEW" };
  const types = normalized.types.filter((type) => allowed(capabilityByType[type]));
  if (!types.length) return { query: normalized.query, results: [], searchedTypes: [], restrictedTypes: normalized.types };
  const result = await context.repository.search(context.organizationId, normalized.query, types, normalized.limit, allowed("VEHICLE_EVIDENCE_RESTRICTED_VIEW"), { actorUserId: user.id, canViewTeam: isManager(user) });
  return { ...result, results: result.results.map(item => ({ ...item, href: withOperationalReturnContext(item.href, returnTo) })), returnTo, restrictedTypes: normalized.types.filter((type) => !types.includes(type)) };
}

export async function getWorkKnowledgeWorkspace(actor: AuthenticatedUser | null, input: Dependencies = {}) { const context = deps(input); await authorize(actor, "WORK_KNOWLEDGE_VIEW", context); return context.repository.knowledgeOverview(context.organizationId, context.now()); }

export async function createWorkKnowledgeDraft(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeKnowledgeDraft(value, context.now()), { user } = await authorize(actor, "WORK_KNOWLEDGE_MANAGE", context, true), id = stableControlledId("knw", context.organizationId, data.idempotencyKey);
  const { idempotencyKey, reason, ...knowledge } = data;
  return context.repository.createKnowledge(command({ actorUserId: user.id, commandType: "CREATE_WORK_KNOWLEDGE_REVISION", domain: "WORK_KNOWLEDGE", expectedVersion: 0, idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason, subjectId: id, subjectType: "WORK_KNOWLEDGE_LINK" }), { ...knowledge, actorUserId: user.id });
}

export async function approveWorkKnowledge(actor: AuthenticatedUser | null, knowledgeId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeKnowledgeApproval(value), { user } = await authorize(actor, "WORK_KNOWLEDGE_MANAGE", context, true), id = required(knowledgeId, "Knowledge ID", 100);
  return context.repository.approveKnowledge(command({ actorUserId: user.id, commandType: "APPROVE_WORK_KNOWLEDGE_REVISION", domain: "WORK_KNOWLEDGE", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: {}, reason: data.reason, subjectId: id, subjectType: "WORK_KNOWLEDGE_LINK" }), user.id, context.now());
}

export async function createVehicleControlledOutput(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeControlledOutput(value), { grants, user } = await authorize(actor, "VEHICLE_OUTPUT_CREATE", context, true);
  if (data.classification === "RESTRICTED") assertVehicleCapability({ actor: user, capability: "VEHICLE_OUTPUT_RESTRICTED", grants, locationId: null, now: context.now() });
  const view = await getVehicle360(user, data.vehicleId, { now: context.now, organizationId: context.organizationId, foundationRepository: context.foundationRepository, enforceRollout: false }), generatedAt = context.now(), built = buildControlledVehiclePackage({ classification: data.classification, generatedAt, generatedBy: { id: user.id, name: user.name }, reason: data.reason, view: payload(view) }), id = stableControlledId("out", context.organizationId, data.idempotencyKey), expiresAt = new Date(generatedAt.getTime() + 7 * 24 * 60 * 60_000);
  const saved = await context.repository.createOutput(command({ actorUserId: user.id, commandType: "GENERATE_VEHICLE_CONTROLLED_OUTPUT", domain: "VEHICLE_OUTPUT", expectedVersion: 0, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: { classification: data.classification, format: data.format, vehicleId: data.vehicleId }, reason: data.reason, subjectId: id, subjectType: "VEHICLE_CONTROLLED_OUTPUT" }), { ...built, actorUserId: user.id, classification: data.classification, expiresAt, format: data.format, vehicleId: data.vehicleId });
  return { ...saved, downloadUrl: `/api/vehicle-output/${id}` };
}

export async function downloadVehicleControlledOutput(actor: AuthenticatedUser | null, outputId: string, input: Dependencies = {}) {
  const context = deps(input), { grants, user } = await authorize(actor, "VEHICLE_OUTPUT_CREATE", context), output = await context.repository.getOutput(context.organizationId, required(outputId, "Output ID", 100));
  if (!output) throw new Error("Controlled output was not found."); if (output.expiresAt < context.now()) throw new Error("Controlled output has expired and must be regenerated.");
  if (output.classification === "RESTRICTED") assertVehicleCapability({ actor: user, capability: "VEHICLE_OUTPUT_RESTRICTED", grants, locationId: null, now: context.now() });
  await context.repository.recordOutputDownload(context.organizationId, output.id, user.id, "Authorized controlled output download.");
  const snapshot = output.packageSnapshot as Record<string, unknown>, content = output.format === "PRINT_HTML" ? renderControlledPrint(snapshot) : JSON.stringify(snapshot, null, 2);
  return { content, contentType: output.format === "PRINT_HTML" ? "text/html; charset=utf-8" : "application/json; charset=utf-8", fileName: `${output.vehicle.vehicleNumber}-vehicle-360-${output.id}.${output.format === "PRINT_HTML" ? "html" : "json"}` };
}
