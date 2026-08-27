import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_GOVERNED_CUSTOM_FIELDS_CONTRACT_VERSION,
  UnifiedCrmGovernedCustomFieldsError,
  type UnifiedCrmCustomLayoutPreviewSection,
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

const LAYOUT_PREVIEW: UnifiedCrmCustomLayoutPreviewSection[] = [
  {
    id: "customer-relationship-preferences",
    label: "Relationship preferences",
    targetSurface: "CUSTOMER_360",
    fields: [
      { id: "preferred_followup_style", label: "Preferred follow-up style", type: "SELECT", classification: "INTERNAL", publishEnabled: false },
      { id: "vip_review_required", label: "VIP review required", type: "BOOLEAN", classification: "RESTRICTED", publishEnabled: false }
    ]
  },
  {
    id: "opportunity-review-context",
    label: "Opportunity review context",
    targetSurface: "OPPORTUNITY_DETAIL",
    fields: [
      { id: "purchase_timeframe", label: "Purchase timeframe", type: "SELECT", classification: "STANDARD", publishEnabled: false },
      { id: "manager_attention_reason", label: "Manager attention reason", type: "TEXT", classification: "INTERNAL", publishEnabled: false }
    ]
  },
  {
    id: "quote-review-controls",
    label: "Quote review controls",
    targetSurface: "QUOTE_REVIEW",
    fields: [
      { id: "approval_expiration_date", label: "Approval expiration date", type: "DATE", classification: "STANDARD", publishEnabled: false },
      { id: "margin_review_flag", label: "Margin review flag", type: "BOOLEAN", classification: "RESTRICTED", publishEnabled: false }
    ]
  }
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
    layoutPreview: {
      state: "READY_REVIEW",
      publishEnabled: false,
      sections: LAYOUT_PREVIEW.map((section) => ({
        ...section,
        fields: section.fields.map((field) => ({ ...field }))
      }))
    },
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "standard-crm-fields-and-layouts", featureControl: "crm.enterprise.customFields.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
