import { randomBytes, randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { hashAccessToken, maskDestination, normalizeLifecycleCommand, object, required } from "./domain";
import { createCustomerLifecycleRepository, type CustomerLifecycleRepository } from "./repository";

type Dependencies = { enforceRollout?: boolean; foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: CustomerLifecycleRepository };
function dependencies(input: Dependencies) { return { enforceRollout: input.enforceRollout ?? true, foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createCustomerLifecycleRepository() }; }
function payload(value: unknown) { return JSON.parse(JSON.stringify(value)) as Record<string, unknown>; }

async function authorize(actor: AuthenticatedUser | null, capability: VehicleCapability, context: ReturnType<typeof dependencies>, mutation = false) {
  const user = assertAuthenticatedUser(actor), grants = await context.foundationRepository.listCapabilityGrants(user.id, context.organizationId); assertVehicleCapability({ actor: user, capability, grants, locationId: null, now: context.now() });
  if (mutation && context.enforceRollout) { const flags = await context.foundationRepository.listFeatureFlags(context.organizationId), decision = evaluateVehicleOperationsFeature(flags, "CUSTOMER_LIFECYCLE", user.id, null); if (!decision.executable) throw new Error(`Customer lifecycle mutations are not enabled (${decision.reason}).`); }
  return user;
}

function capability(action: string, approve = false): VehicleCapability {
  if (action.includes("WARRANTY")) return action.startsWith("CREATE") || action.startsWith("TRANSITION") ? "WARRANTY_MANAGE" : "WARRANTY_VIEW";
  if (action.includes("COMMERCIAL_HANDOFF")) return action.startsWith("CREATE") || action.startsWith("TRANSITION") ? "COMMERCIAL_HANDOFF_MANAGE" : "COMMERCIAL_HANDOFF_VIEW";
  if (action.includes("PORTAL_GRANT")) return "VEHICLE_PORTAL_MANAGE";
  if (action.includes("POLICY")) return approve ? "VEHICLE_POLICY_APPROVE" : action === "CREATE_POLICY_DRAFT" || action === "SIMULATE_POLICY" || action === "ACTIVATE_POLICY" || action === "ROLLBACK_POLICY" ? "VEHICLE_POLICY_MANAGE" : "VEHICLE_POLICY_VIEW";
  return "CUSTOMER_LIFECYCLE_MANAGE";
}

const subjectTypes: Record<string, string> = {
  UPSERT_SERVICE_PROMISE: "CUSTOMER_SERVICE_PROMISE", RECORD_COMMUNICATION_PREFERENCE: "CUSTOMER_COMMUNICATION_PREFERENCE", CREATE_ESTIMATE_APPROVAL: "CUSTOMER_ESTIMATE_APPROVAL", RECORD_ESTIMATE_DELIVERY: "CUSTOMER_ESTIMATE_APPROVAL", PUBLISH_SERVICE_STATUS: "CUSTOMER_SERVICE_STATUS",
  CREATE_WARRANTY_COVERAGE: "WARRANTY_COVERAGE", CREATE_WARRANTY_CLAIM: "WARRANTY_CLAIM", TRANSITION_WARRANTY_CLAIM: "WARRANTY_CLAIM", RECONCILE_SERVICE_INVOICE: "SERVICE_INVOICE_PACKAGE",
  CREATE_COMMERCIAL_HANDOFF: "COMMERCIAL_HANDOFF", TRANSITION_COMMERCIAL_HANDOFF: "COMMERCIAL_HANDOFF", CREATE_PORTAL_GRANT: "VEHICLE_PORTAL_GRANT", REVOKE_PORTAL_GRANT: "VEHICLE_PORTAL_GRANT",
  CREATE_POLICY_DRAFT: "VEHICLE_POLICY", SIMULATE_POLICY: "VEHICLE_POLICY", APPROVE_POLICY: "VEHICLE_POLICY", ACTIVATE_POLICY: "VEHICLE_POLICY", ROLLBACK_POLICY: "VEHICLE_POLICY",
};

const creates = new Set(["UPSERT_SERVICE_PROMISE", "RECORD_COMMUNICATION_PREFERENCE", "CREATE_ESTIMATE_APPROVAL", "PUBLISH_SERVICE_STATUS", "CREATE_WARRANTY_COVERAGE", "CREATE_WARRANTY_CLAIM", "CREATE_COMMERCIAL_HANDOFF", "CREATE_PORTAL_GRANT", "CREATE_POLICY_DRAFT"]);

export async function getCustomerLifecycleWorkspace(actor: AuthenticatedUser | null, input: Dependencies = {}) { const context = dependencies(input); await authorize(actor, "CUSTOMER_LIFECYCLE_VIEW", context); return context.repository.overview(context.organizationId); }

export async function executeCustomerLifecycleCommand(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input), normalized = normalizeLifecycleCommand(value, context.now()), action = normalized.action, user = await authorize(actor, capability(action, action === "APPROVE_POLICY"), context, true), raw = payload(normalized);
  let locationId: string | null = null;
  if(["CREATE_ESTIMATE_APPROVAL","RECORD_ESTIMATE_DELIVERY","RECONCILE_SERVICE_INVOICE"].includes(action)) {
    const scope=await context.repository.serviceCommandLocation(context.organizationId,action,raw);
    if(!scope)throw new Error("Scoped repair order was not found.");
    locationId=scope.locationId;
    const grants=await context.foundationRepository.listCapabilityGrants(user.id,context.organizationId);
    for(const permission of ["REPAIR_ORDER_VIEW",action==="RECONCILE_SERVICE_INVOICE"?"SERVICE_BILLING_MANAGE":"REPAIR_ORDER_MANAGE"] as const)assertVehicleCapability({actor:user,capability:permission,grants,locationId,now:context.now()});
  }
  const receipt = await context.repository.policyCommandReceipt?.(context.organizationId, action, normalized.idempotencyKey);
  const original = receipt && "domainEvents" in receipt ? (receipt.domainEvents[0]?.payload as Record<string,unknown> | undefined) : undefined;
  for(const field of ["effectiveAt","effectiveFrom","publishedAt","occurredAt","reconciledAt"])if((value as Record<string,unknown>)[field]==null&&original?.[field]!==undefined)raw[field]=original[field];
  const id = creates.has(action) ? receipt?.subjectId ?? randomUUID() : required(normalized.subjectId, "Subject ID", 100), subjectType = subjectTypes[action];
  let rawToken: string | null = null;
  if (action === "CREATE_ESTIMATE_APPROVAL" || action === "CREATE_PORTAL_GRANT") { if (receipt) { raw.tokenHashSha256 = await context.repository.accessTokenHash(context.organizationId, action, receipt.subjectId); } else { rawToken = randomBytes(32).toString("base64url"); raw.tokenHashSha256 = hashAccessToken(rawToken); } }
  if (action === "CREATE_ESTIMATE_APPROVAL") raw.destinationMasked = maskDestination(String(raw.destination));
  const expectedVersion = receipt?.expectedVersion ?? (creates.has(action) ? 0 : await context.repository.aggregateVersion(context.organizationId, subjectType, id));
  const command = normalizeEnterpriseCommand({ actorUserId: user.id, commandType: action, domain: "CUSTOMER_LIFECYCLE", expectedVersion, idempotencyKey: normalized.idempotencyKey, locationId, organizationId: context.organizationId, payload: raw, reason: normalized.reason, subjectId: id, subjectType });
  const result = await context.repository.execute(command, raw);
  if (!rawToken) return result;
  return { ...result, accessUrl: action === "CREATE_PORTAL_GRANT" ? `/portal/vehicle/${rawToken}` : `/portal/estimate/${rawToken}`, accessToken: rawToken };
}

export async function getVehiclePortalView(token: string, requestHash: string, input: Dependencies = {}) { const context = dependencies(input); return context.repository.portalView(required(token, "Portal token", 200), context.now(), requestHash); }

export async function decidePortalEstimate(token: string, approvalId: string, value: unknown, requestHash: string, input: Dependencies = {}) {
  const context = dependencies(input), raw = object(value), approvedLineKeys = Array.isArray(raw.approvedLineKeys) ? raw.approvedLineKeys.map(String) : [], declinedLineKeys = Array.isArray(raw.declinedLineKeys) ? raw.declinedLineKeys.map(String) : [];
  return context.repository.decideEstimate(required(token, "Portal token", 200), required(approvalId, "Approval ID", 100), { approvedLineKeys, declinedLineKeys, decisionName: required(raw.decisionName, "Decision name", 200), requestHash }, context.now());
}
