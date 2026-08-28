import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_ENTERPRISE_FIELD_SHARING_CONTRACT_VERSION,
  UnifiedCrmEnterpriseFieldSharingError,
  type UnifiedCrmEnterpriseFieldSharingCheck,
  type UnifiedCrmEnterpriseFieldSharingReadModel
} from "@/server/unified-crm/enterprise-field-sharing-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmEnterpriseFieldSharingCheck[] = [
  {
    category: "formalAccessModel",
    evidence: "Enterprise sharing must be modeled as capability, organization, location, owner/team, record, field, purpose, and separation-of-duties intersections.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "fieldClassification",
    evidence: "Sensitive contact, finance, restricted note, integration payload, audit/security, and AI trace fields remain explicitly classified and masked by default.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "recordScope",
    evidence: "Record-level exceptions require approved subject, actor, purpose, expiration, evidence, and revocation semantics before activation.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "territoryRules",
    evidence: "Territory ownership, overlap, reassignment, escalation, and inherited visibility rules are not yet approved.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "policyProof",
    evidence: "Policy proof must include allow, deny, cross-organization, inactive user, field masking, and owner/territory edge cases.",
    holdOwner: "quality",
    status: "HOLD"
  },
  {
    category: "adminPreview",
    evidence: "Admin preview must show effective access before publishing without granting administrators implicit record access.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "audit",
    evidence: "Sharing decisions must produce durable audit records for grant, deny, preview, publish, revoke, expiration, and rollback.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "migration",
    evidence: "Migration must be additive and reversible; existing organization/role access remains source fallback until cutover approval.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "scaleTests",
    evidence: "Large-account and territory matrix scale tests remain pending.",
    holdOwner: "quality",
    status: "HOLD"
  },
  {
    category: "rollback",
    evidence: "Rollback returns to existing role and organization scope with all enterprise overrides disabled.",
    holdOwner: null,
    status: "PASS"
  }
];

export async function getUnifiedCrmEnterpriseFieldSharing(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmEnterpriseFieldSharingReadModel> {
  if (!actor) {
    throw new UnifiedCrmEnterpriseFieldSharingError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM enterprise sharing readiness.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmEnterpriseFieldSharingError(
      "ENTERPRISE_FIELD_SHARING_NOT_AUTHORIZED",
      "CRM enterprise sharing readiness is available to the manager workspace."
    );
  }

  return {
    activation: {
      customRecordSharingEnabled: false,
      fieldOverrideEnabled: false,
      territorySharingEnabled: false,
      state: "HELD"
    },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_ENTERPRISE_FIELD_SHARING_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: {
      fallback: "existing-role-and-organization-scope",
      featureControl: "crm.enterprise.fieldSharing.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
