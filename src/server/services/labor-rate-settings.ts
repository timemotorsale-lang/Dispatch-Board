import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, canManageSettings } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { executeCustomerLifecycleCommand } from "@/server/customer-lifecycle/service";

export const LABOR_RATE_POLICY_CODE = "SHOP_LABOR_RATE";
export function normalizeLaborRateConfiguration(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Labor-rate configuration is required.");
  const config = value as { version: unknown; laborRateCents: unknown };
  if (config.version !== 1 || typeof config.laborRateCents !== "number" || !Number.isSafeInteger(config.laborRateCents) || config.laborRateCents < 0 || config.laborRateCents > 100000) throw new Error("Labor rate must be from $0 through $1,000 in whole cents.");
  return { version: 1, laborRateCents: config.laborRateCents };
}

export async function getActiveLaborRate(user: AuthenticatedUser | null) {
  assertAuthenticatedUser(user);
  const policy = await prisma.vehiclePolicyVersion.findFirst({ where: { organizationId: INITIAL_ORGANIZATION.id, policyCode: LABOR_RATE_POLICY_CODE, domain: "ESTIMATE_PRICING", status: "ACTIVE", effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }, orderBy: { version: "desc" } });
  if (!policy) return { laborRate: 125, policyId: "shop-default-125", policyVersion: 0 };
  const config = normalizeLaborRateConfiguration(policy.configuration);
  return { laborRate: config.laborRateCents / 100, policyId: policy.id, policyVersion: policy.version };
}

function manager(user: AuthenticatedUser | null) {
  const actor = assertAuthenticatedUser(user);
  if (!canManageSettings(actor)) throw new Error("Manager access required.");
  return actor;
}

export async function getLaborRateSettings(user: AuthenticatedUser | null) {
  manager(user);
  const [active, policies] = await Promise.all([getActiveLaborRate(user), prisma.vehiclePolicyVersion.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, policyCode: LABOR_RATE_POLICY_CODE, domain: "ESTIMATE_PRICING" }, orderBy: { version: "desc" }, take: 30 })]);
  return { active, policies: policies.map(policy => ({ id: policy.id, version: policy.version, status: policy.status, laborRateCents: normalizeLaborRateConfiguration(policy.configuration).laborRateCents, reason: policy.reason, createdByUserId: policy.createdByUserId })) };
}

export async function changeLaborRateSettings(user: AuthenticatedUser | null, value: unknown) {
  const actor = manager(user);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Labor-rate command is required.");
  const raw = value as Record<string, unknown>;
  const common = { idempotencyKey: raw.idempotencyKey, reason: raw.reason };
  if (raw.action === "CREATE_POLICY_DRAFT") {
    const configuration = normalizeLaborRateConfiguration({ version: 1, laborRateCents: raw.laborRateCents });
    return executeCustomerLifecycleCommand(actor, { ...common, action: raw.action, policyCode: LABOR_RATE_POLICY_CODE, domain: "ESTIMATE_PRICING", configuration, pilotScope: {} });
  }
  if (!["SIMULATE_POLICY", "APPROVE_POLICY", "ACTIVATE_POLICY"].includes(String(raw.action)) || typeof raw.subjectId !== "string") throw new Error("Invalid labor-rate action.");
  const policy = await prisma.vehiclePolicyVersion.findFirst({ where: { id: raw.subjectId, organizationId: INITIAL_ORGANIZATION.id, policyCode: LABOR_RATE_POLICY_CODE, domain: "ESTIMATE_PRICING" } });
  if (!policy) throw new Error("Labor-rate policy was not found.");
  const configuration = normalizeLaborRateConfiguration(policy.configuration);
  return executeCustomerLifecycleCommand(actor, { ...common, subjectId: policy.id, action: raw.action, simulationSnapshot: { validatedConfiguration: configuration, preservesExistingEstimates: true, appliesToNewDrafts: true }, effectiveFrom: (policy.approvedAt ?? policy.createdAt).toISOString(), pilotScope: {}, outcomeSnapshot: { appliesToNewDrafts: true } });
}
