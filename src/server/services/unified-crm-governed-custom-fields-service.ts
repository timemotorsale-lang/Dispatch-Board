import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_CONTRACT_VERSION,
  UnifiedCrmGovernedCustomFieldsError,
  type UnifiedCrmGovernedCustomFieldsCheck,
  type UnifiedCrmGovernedCustomFieldsReadModel
} from "@/server/unified-crm/governed-custom-fields-contract";

type Dependencies = { now?: () => Date };

const CHECKS: UnifiedCrmGovernedCustomFieldsCheck[] = [
  { category: "namespace", evidence: "Custom metadata must use a CRM-owned namespace and cannot shadow source-domain fields.", holdOwner: null, status: "PASS" },
  { category: "types", evidence: "Allowed field types, coercion rules, encrypted/masked classifications, and unsupported types remain unapproved.", holdOwner: "product-owner", status: "HOLD" },
  { category: "versioning", evidence: "Draft, validation, publish, effective-date, archive, and rollback versions are required before activation.", holdOwner: null, status: "PASS" },
  { category: "validation", evidence: "Validation must prove required/default behavior, enum changes, deleted fields, and data migration impact.", holdOwner: "quality", status: "HOLD" },
  { category: "indexing", evidence: "Indexing and search/reporting performance limits must be approved before fields become queryable.", holdOwner: "architecture", status: "HOLD" },
  { category: "permissions", evidence: "Custom field visibility must intersect standard CRM capability, field classification, purpose, and organization rules.", holdOwner: null, status: "PASS" },
  { category: "reportingImpact", evidence: "Reporting and dashboard impact must be previewed before published custom fields affect analytics.", holdOwner: "product-owner", status: "HOLD" },
  { category: "limits", evidence: "Field count, layout sections, required fields, indexed fields, and per-record storage limits are not yet approved.", holdOwner: "architecture", status: "HOLD" },
  { category: "adminPreview", evidence: "Admin preview must show effective user experience and effective access before publish.", holdOwner: "product-owner", status: "HOLD" },
  { category: "rollback", evidence: "Rollback returns to standard CRM fields/layouts and preserves historical values as non-authoritative metadata.", holdOwner: null, status: "PASS" }
];

export async function getUnifiedCrmGovernedCustomFields(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmGovernedCustomFieldsReadModel> {
  if (!actor) throw new UnifiedCrmGovernedCustomFieldsError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM custom field readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmGovernedCustomFieldsError("GOVERNED_CUSTOM_FIELDS_NOT_AUTHORIZED", "CRM custom field readiness is available to the manager workspace.");
  }
  return {
    activation: { customFieldPublishEnabled: false, layoutPublishEnabled: false, runtimeMutationEnabled: false, state: "HELD" },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "standard-crm-fields-and-layouts", featureControl: "crm.enterprise.customFields.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
