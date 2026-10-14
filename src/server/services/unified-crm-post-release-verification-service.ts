import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_POST_RELEASE_VERIFICATION_CONTRACT_VERSION,
  UnifiedCrmPostReleaseVerificationError,
  type UnifiedCrmPostReleaseCheck,
  type UnifiedCrmPostReleaseVerificationReadModel
} from "@/server/unified-crm/post-release-verification-contract";

type Dependencies = {
  now?: () => Date;
};

const checks: UnifiedCrmPostReleaseCheck[] = [
  {
    checkId: "UCRM-POST-001",
    name: "Smoke workflows for approved manager and staff journeys",
    owner: "operations",
    rollbackIfFailed: true,
    status: "PENDING"
  },
  {
    checkId: "UCRM-POST-002",
    name: "Customer and activity reconciliation",
    owner: "data-migration",
    rollbackIfFailed: true,
    status: "PENDING"
  },
  {
    checkId: "UCRM-POST-003",
    name: "Alerts and incident routing",
    owner: "observability",
    rollbackIfFailed: true,
    status: "PENDING"
  },
  {
    checkId: "UCRM-POST-004",
    name: "Error, latency, and freshness measurements",
    owner: "engineering",
    rollbackIfFailed: true,
    status: "PENDING"
  },
  {
    checkId: "UCRM-POST-005",
    name: "Audit delivery and restricted-record access review",
    owner: "security-review",
    rollbackIfFailed: true,
    status: "PENDING"
  },
  {
    checkId: "UCRM-POST-006",
    name: "Support intake and staff feedback capture",
    owner: "operations",
    rollbackIfFailed: false,
    status: "PENDING"
  }
];

function healthDecisionFor(rows: UnifiedCrmPostReleaseCheck[]): UnifiedCrmPostReleaseVerificationReadModel["healthDecision"] {
  if (rows.some((check) => check.status === "FAIL" && check.rollbackIfFailed)) return "ROLLBACK_REQUIRED";
  if (rows.every((check) => check.status === "PASS")) return "HEALTHY";
  if (rows.every((check) => check.status === "PENDING")) return "PENDING_ENABLEMENT";
  return "HELD";
}

export async function getUnifiedCrmPostReleaseVerification(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmPostReleaseVerificationReadModel> {
  if (!actor) {
    throw new UnifiedCrmPostReleaseVerificationError(
      "AUTHENTICATION_REQUIRED",
      "Sign in before opening CRM post-release verification."
    );
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmPostReleaseVerificationError(
      "POST_RELEASE_VERIFICATION_NOT_AUTHORIZED",
      "CRM post-release verification is available to the manager workspace."
    );
  }
  const rows = checks.map((check) => ({ ...check }));
  return {
    checks: rows,
    contractVersion: UNIFIED_CRM_POST_RELEASE_VERIFICATION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    healthDecision: healthDecisionFor(rows),
    supportIntakeOwner: "operations",
    visibility: "management"
  };
}
