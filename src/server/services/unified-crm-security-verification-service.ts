import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_SECURITY_VERIFICATION_CONTRACT_VERSION,
  UnifiedCrmSecurityVerificationError,
  type UnifiedCrmSecurityVerificationCheck,
  type UnifiedCrmSecurityVerificationReadModel
} from "@/server/unified-crm/security-verification-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmSecurityVerificationCheck[] = [
  {
    category: "organizationIsolation",
    evidence: "CRM read APIs resolve active organization scope and fail closed for missing or ambiguous organization access.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "rbacCapabilities",
    evidence: "Sales and management workspaces are separated through CRM capability resolution; manager-only APIs deny sales users.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "fieldMasking",
    evidence: "Dashboard reconciliation and global search expose operational labels and scoped hrefs rather than raw contact payloads.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "idor",
    evidence: "Owner-scoped CRM reads and typed not-authorized responses are covered by focused service and route tests.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "inputSafety",
    evidence: "CRM commands normalize bounded inputs and route errors use typed safe envelopes.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "csrfSession",
    evidence: "Release-candidate browser/session review still needs a named security pass before pilot enablement.",
    holdOwner: "security-review",
    status: "HOLD"
  },
  {
    category: "exportControls",
    evidence: "CRM export surfaces are not enabled; export policy and denial proof remain a release-candidate hold.",
    holdOwner: "security-review",
    status: "HOLD"
  },
  {
    category: "loggingSecrets",
    evidence: "Structured log and secret redaction review remains a release-candidate hold.",
    holdOwner: "security-review",
    status: "HOLD"
  },
  {
    category: "dependencyScan",
    evidence: "Dependency scan output must be attached against the release candidate.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "abuseRateLimit",
    evidence: "Abuse and rate-limit policy proof remains a release-candidate hold for mutating CRM routes.",
    holdOwner: "engineering",
    status: "HOLD"
  }
];

export async function getUnifiedCrmSecurityVerification(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmSecurityVerificationReadModel> {
  if (!actor) {
    throw new UnifiedCrmSecurityVerificationError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM security verification.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmSecurityVerificationError(
      "SECURITY_VERIFICATION_NOT_AUTHORIZED",
      "CRM security verification is available to the manager workspace."
    );
  }

  const checks = CHECKS.map((check) => ({ ...check }));
  return {
    checks,
    contractVersion: UNIFIED_CRM_SECURITY_VERIFICATION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: checks.some((check) => check.status === "HOLD") ? "HELD" : "PASS",
    visibility: "management"
  };
}
