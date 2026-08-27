import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { UNIFIED_CRM_CONFIGURATION_PROMOTION_CONTRACT_VERSION, UnifiedCrmConfigurationPromotionError, type UnifiedCrmConfigurationPromotionCheck, type UnifiedCrmConfigurationPromotionReadModel } from "@/server/unified-crm/configuration-promotion-contract";

type Dependencies = { now?: () => Date };

const CHECKS: UnifiedCrmConfigurationPromotionCheck[] = [
  { category: "isolation", evidence: "Sandbox configuration must be isolated from production data, users, credentials, and provider effects.", holdOwner: "architecture", status: "HOLD" },
  { category: "maskedData", evidence: "Sandbox data must be synthetic or masked before configuration testing uses real-like records.", holdOwner: "security-privacy", status: "HOLD" },
  { category: "diffReview", evidence: "Promotion must show a human-readable diff of fields, layouts, workflows, permissions, and rollback impact.", holdOwner: null, status: "PASS" },
  { category: "promotion", evidence: "Production promotion requires approval authority, exact version identity, validation proof, and rollback plan.", holdOwner: "product-owner", status: "HOLD" },
  { category: "validation", evidence: "Validation must run policy, migration, accessibility, performance, regression, and source-boundary checks before promotion.", holdOwner: "quality", status: "HOLD" },
  { category: "audit", evidence: "Promotion preview, approval, publish, failure, and rollback must produce durable audit evidence.", holdOwner: null, status: "PASS" },
  { category: "rollback", evidence: "Rollback must restore the last known-good configuration without deleting historical evidence.", holdOwner: null, status: "PASS" }
];

export async function getUnifiedCrmConfigurationPromotion(actor: AuthenticatedUser | null, dependencies: Dependencies = {}): Promise<UnifiedCrmConfigurationPromotionReadModel> {
  if (!actor) throw new UnifiedCrmConfigurationPromotionError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM configuration promotion readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") throw new UnifiedCrmConfigurationPromotionError("CONFIGURATION_PROMOTION_NOT_AUTHORIZED", "CRM configuration promotion readiness is available to the manager workspace.");
  return {
    activation: { productionPromotionEnabled: false, sandboxConfigEnabled: false, state: "HELD" },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_CONFIGURATION_PROMOTION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "manual-reviewed-configuration-change", featureControl: "crm.enterprise.configurationPromotion.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
