import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { LIGHT_DUTY_CATALOG_VERSION, LIGHT_DUTY_OPERATIONS, LIGHT_DUTY_SYSTEMS } from "@/lib/light-duty-baseline";
import { lightDutyScopeProfile } from "@/lib/light-duty-scope-profiles";
import { expandedOperationForLineKey } from "@/lib/catalog-job-readiness";

export const CATALOG_POLICY_DOMAIN = "LABOR_CATALOG";
export const catalogPolicyCode = (systemId: string) => `LABOR_CATALOG_${systemId.toUpperCase()}`;
export function catalogScopeDigest(systemId: string) {
  if (!LIGHT_DUTY_SYSTEMS.some(system => system.id === systemId)) throw new Error("Unknown expanded catalog system.");
  return createHash("sha256").update(JSON.stringify(LIGHT_DUTY_OPERATIONS.filter(operation => operation.systemId === systemId).map(operation => ({ operation, profile: lightDutyScopeProfile(systemId, operation.groupId, operation.label, operation.diagnosis) })))).digest("hex");
}

export type CatalogApprovalConfiguration = {
  version: 1; catalogVersion: string; systemId: string; scopeDigest: string;
  enabled: boolean; reviewReference: string; capabilityReference: string;
};

export function validateCatalogApproval(value: unknown): CatalogApprovalConfiguration {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Catalog approval configuration is required.");
  const config = value as CatalogApprovalConfiguration;
  if (config.version !== 1 || config.catalogVersion !== LIGHT_DUTY_CATALOG_VERSION || typeof config.enabled !== "boolean" || config.scopeDigest !== catalogScopeDigest(config.systemId)) throw new Error("Catalog scope changed or configuration is invalid. Create and independently review a new policy.");
  for (const reference of [config.reviewReference, config.capabilityReference]) if (typeof reference !== "string" || reference.trim().length < 10 || reference.length > 2000) throw new Error("A detailed shop scope and capability review reference is required.");
  return config;
}

export async function readCatalogApproval(database: Pick<Prisma.TransactionClient, "vehiclePolicyVersion">, organizationId: string, systemId: string, at = new Date()) {
  const policy = await database.vehiclePolicyVersion.findFirst({ where: { organizationId, domain: CATALOG_POLICY_DOMAIN, policyCode: catalogPolicyCode(systemId), status: "ACTIVE", effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] }, orderBy: { version: "desc" } });
  if (!policy) return null;
  const config = validateCatalogApproval(policy.configuration);
  if (config.systemId !== systemId || !config.enabled || !policy.approvedByUserId || policy.approvedByUserId === policy.createdByUserId || !policy.approvedAt || !policy.activatedAt) return null;
  return { policyId: policy.id, version: policy.version, systemId, scopeDigest: config.scopeDigest };
}

export async function assertCatalogLineApproved(database: Pick<Prisma.TransactionClient, "vehiclePolicyVersion">, organizationId: string, lineKey: string, at = new Date()) {
  const operation = expandedOperationForLineKey(lineKey);
  if (operation && !await readCatalogApproval(database, organizationId, operation.systemId, at)) throw new Error(`Expanded ${operation.systemId} work is on hold until its current catalog scope has an active independently approved shop policy.`);
}
