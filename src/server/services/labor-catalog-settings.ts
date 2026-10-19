import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, canManageSettings } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { executeCustomerLifecycleCommand } from "@/server/customer-lifecycle/service";
import { LIGHT_DUTY_CATALOG_VERSION, LIGHT_DUTY_SYSTEMS } from "@/lib/light-duty-baseline";
import { CATALOG_POLICY_DOMAIN, catalogPolicyCode, catalogScopeDigest, readCatalogApproval, validateCatalogApproval } from "@/server/diagnostics/catalog-approval";

function administrator(user: AuthenticatedUser | null) {
  const actor = assertAuthenticatedUser(user);
  if (!canManageSettings(actor)) throw new Error("Manager access required.");
  return actor;
}

export async function getConnectedCatalogSystems(user: AuthenticatedUser | null) {
  assertAuthenticatedUser(user);
  const decisions = await Promise.allSettled(LIGHT_DUTY_SYSTEMS.map(system => readCatalogApproval(prisma, INITIAL_ORGANIZATION.id, system.id)));
  return { allowedSystemIds: ["brakes", "steering", ...decisions.flatMap(result => result.status === "fulfilled" && result.value ? [result.value.systemId] : [])], unavailable: decisions.some(result => result.status === "rejected") };
}

export async function getLaborCatalogSettings(user: AuthenticatedUser | null) {
  administrator(user);
  const [rollout, policies] = await Promise.all([
    getConnectedCatalogSystems(user),
    prisma.vehiclePolicyVersion.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, domain: CATALOG_POLICY_DOMAIN }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  return { ...rollout, systems: LIGHT_DUTY_SYSTEMS.map(system => ({ id: system.id, label: system.label, groups: system.groups.length, operations: system.groups.reduce((sum, group) => sum + group.operations.length, 0), scopeDigest: catalogScopeDigest(system.id) })), policies: policies.map(policy => ({ id: policy.id, status: policy.status, version: policy.version, createdByUserId: policy.createdByUserId, configuration: policy.configuration, reason: policy.reason })) };
}

export async function changeLaborCatalogSettings(user: AuthenticatedUser | null, value: unknown) {
  const actor = administrator(user);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Catalog policy command is required.");
  const raw = value as Record<string, unknown>;
  const common = { reason: raw.reason, idempotencyKey: raw.idempotencyKey };
  if (raw.action === "CREATE_POLICY_DRAFT") {
    if (raw.scopeReviewed !== true) throw new Error("Explicit review of every operation in this system is required.");
    const systemId = String(raw.systemId ?? "");
    const configuration = validateCatalogApproval({ version: 1, catalogVersion: LIGHT_DUTY_CATALOG_VERSION, systemId, scopeDigest: catalogScopeDigest(systemId), enabled: raw.enabled, reviewReference: raw.reviewReference, capabilityReference: raw.capabilityReference });
    return executeCustomerLifecycleCommand(actor, { ...common, action: raw.action, policyCode: catalogPolicyCode(systemId), domain: CATALOG_POLICY_DOMAIN, configuration, pilotScope: {} });
  }
  if (!["SIMULATE_POLICY", "APPROVE_POLICY", "ACTIVATE_POLICY"].includes(String(raw.action)) || typeof raw.subjectId !== "string") throw new Error("Invalid catalog policy action.");
  const policy = await prisma.vehiclePolicyVersion.findFirst({ where: { id: raw.subjectId, organizationId: INITIAL_ORGANIZATION.id, domain: CATALOG_POLICY_DOMAIN } });
  if (!policy) throw new Error("Catalog policy was not found.");
  const configuration = validateCatalogApproval(policy.configuration);
  if (policy.policyCode !== catalogPolicyCode(configuration.systemId)) throw new Error("Catalog policy scope is invalid.");
  return executeCustomerLifecycleCommand(actor, { ...common, action: raw.action, subjectId: policy.id, simulationSnapshot: { configuration, historicalEstimatesUnchanged: true }, effectiveFrom: (policy.approvedAt ?? policy.createdAt).toISOString(), pilotScope: {}, outcomeSnapshot: { enabled: configuration.enabled, scopeDigest: configuration.scopeDigest } });
}
