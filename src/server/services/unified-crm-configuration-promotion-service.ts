import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_CONFIGURATION_PROMOTION_CONTRACT_VERSION,
  UnifiedCrmConfigurationPromotionError,
  type UnifiedCrmConfigurationPromotionCheck,
  type UnifiedCrmConfigurationPromotionDiffItem,
  type UnifiedCrmConfigurationPromotionReadModel
} from "@/server/unified-crm/configuration-promotion-contract";

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

const DIFF_ITEMS: UnifiedCrmConfigurationPromotionDiffItem[] = [
  { id: "fields-preview", area: "FIELDS", changeType: "ADD", title: "Preview custom CRM metadata fields", impact: "Adds design-time field definitions only; no runtime data is written.", productionApplyEnabled: false },
  { id: "layout-preview", area: "LAYOUTS", changeType: "CHANGE", title: "Preview Customer 360 and Opportunity layout sections", impact: "Shows proposed sections without publishing them to staff workflows.", productionApplyEnabled: false },
  { id: "workflow-preview", area: "WORKFLOWS", changeType: "REVIEW", title: "Preview workflow simulation rules", impact: "Allows deterministic simulation review; no trigger executes.", productionApplyEnabled: false },
  { id: "permission-preview", area: "PERMISSIONS", changeType: "REVIEW", title: "Review manager/admin-only access", impact: "Confirms preview access stays limited to management workspaces.", productionApplyEnabled: false },
  { id: "rollback-preview", area: "ROLLBACK", changeType: "REVIEW", title: "Confirm rollback to standard CRM configuration", impact: "Keeps standard fields, layouts, and source workflows as fallback.", productionApplyEnabled: false }
];

export async function getUnifiedCrmConfigurationPromotion(actor: AuthenticatedUser | null, dependencies: Dependencies = {}): Promise<UnifiedCrmConfigurationPromotionReadModel> {
  if (!actor) throw new UnifiedCrmConfigurationPromotionError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM configuration promotion readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") throw new UnifiedCrmConfigurationPromotionError("CONFIGURATION_PROMOTION_NOT_AUTHORIZED", "CRM configuration promotion readiness is available to the manager workspace.");
  return {
    activation: { productionPromotionEnabled: false, sandboxConfigEnabled: false, state: "HELD" },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_CONFIGURATION_PROMOTION_CONTRACT_VERSION,
    diffReview: {
      state: "READY_REVIEW",
      productionApplyEnabled: false,
      items: DIFF_ITEMS.map((item) => ({ ...item }))
    },
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "manual-reviewed-configuration-change", featureControl: "crm.enterprise.configurationPromotion.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
