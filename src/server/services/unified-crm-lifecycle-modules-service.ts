import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { UNIFIED_CRM_LIFECYCLE_MODULES_CONTRACT_VERSION, UnifiedCrmLifecycleModulesError, type UnifiedCrmLifecycleModulesCheck, type UnifiedCrmLifecycleModulesReadModel } from "@/server/unified-crm/lifecycle-modules-contract";

type Dependencies = { now?: () => Date };
const CHECKS: UnifiedCrmLifecycleModulesCheck[] = [
  { category: "domainBoundary", evidence: "Each broader lifecycle module must declare its own owner, source authority, data contracts, and excluded domains.", holdOwner: "product-owner", status: "HOLD" },
  { category: "securityModel", evidence: "Each module requires capability, organization, record, field, purpose, audit, and separation-of-duties rules before activation.", holdOwner: null, status: "PASS" },
  { category: "sourceAuthority", evidence: "Renewal, account health, service/case, marketing, and commercial expansions cannot overwrite existing source domains by shortcut.", holdOwner: null, status: "PASS" },
  { category: "testing", evidence: "Each module requires focused tests, cross-domain regression, accessibility, fallback, and rollback proof.", holdOwner: "quality", status: "HOLD" },
  { category: "pilot", evidence: "Each module requires named pilot cohort approval before live enablement.", holdOwner: "product-owner", status: "HOLD" },
  { category: "releaseGate", evidence: "Each module requires explicit release approval and post-release verification.", holdOwner: "operations", status: "HOLD" },
  { category: "rollback", evidence: "Rollback must return users to existing CRM core and source-domain consoles without data loss.", holdOwner: null, status: "PASS" }
];

export async function getUnifiedCrmLifecycleModules(actor: AuthenticatedUser | null, dependencies: Dependencies = {}): Promise<UnifiedCrmLifecycleModulesReadModel> {
  if (!actor) throw new UnifiedCrmLifecycleModulesError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM lifecycle module readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") throw new UnifiedCrmLifecycleModulesError("LIFECYCLE_MODULES_NOT_AUTHORIZED", "CRM lifecycle module readiness is available to the manager workspace.");
  return {
    activation: { accountHealthEnabled: false, marketingExpansionEnabled: false, renewalModuleEnabled: false, serviceCaseExpansionEnabled: false, state: "HELD" },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_LIFECYCLE_MODULES_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "existing-crm-core-and-source-domain-consoles", featureControl: "crm.enterprise.lifecycleModules.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
