import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_PILOT_FINDING_CLOSURE_CONTRACT_VERSION,
  UnifiedCrmPilotFindingClosureError,
  type UnifiedCrmPilotFindingClosure,
  type UnifiedCrmPilotFindingClosureReadModel
} from "@/server/unified-crm/pilot-finding-closure-contract";

type Dependencies = {
  now?: () => Date;
};

const pendingFindings: UnifiedCrmPilotFindingClosure[] = [
  {
    findingId: "UCRM-PILOT-FINDING-001",
    summary: "Actual pilot participant defects and friction themes from UCRM-068 have not been closed.",
    owner: "product",
    status: "PENDING_CLOSURE",
    releaseImpact: "BLOCKS_RELEASE",
    closureEvidence: []
  },
  {
    findingId: "UCRM-PILOT-FINDING-002",
    summary: "UCRM-061 security holds must be fixed, accepted, or removed from the enabled pilot scope.",
    owner: "security-review",
    status: "PENDING_CLOSURE",
    releaseImpact: "BLOCKS_RELEASE",
    closureEvidence: []
  },
  {
    findingId: "UCRM-PILOT-FINDING-003",
    summary: "UCRM-065 full regression holds need release-candidate proof before any scope is enabled.",
    owner: "engineering",
    status: "PENDING_CLOSURE",
    releaseImpact: "BLOCKS_RELEASE",
    closureEvidence: []
  },
  {
    findingId: "UCRM-PILOT-FINDING-004",
    summary: "UCRM-067 rollback timing and authority must be rehearsed or excluded from release scope.",
    owner: "operations",
    status: "PENDING_CLOSURE",
    releaseImpact: "BLOCKS_RELEASE",
    closureEvidence: []
  }
];

const requiredBeforeReleaseCandidateValidation = [
  "Attach regression proof for every fixed pilot finding.",
  "Record owner and acceptance date for every accepted known limitation.",
  "Remove any unresolved capability from enabled scope before release-candidate validation.",
  "Confirm no finding with BLOCKS_RELEASE remains pending."
];

const closedStatuses = new Set(["FIXED_WITH_REGRESSION", "ACCEPTED_LIMITATION", "REMOVED_FROM_SCOPE"]);

function isReleaseCandidateReady(findings: UnifiedCrmPilotFindingClosure[]) {
  return findings.every((finding) => closedStatuses.has(finding.status) && finding.releaseImpact !== "BLOCKS_RELEASE");
}

export async function getUnifiedCrmPilotFindingClosure(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmPilotFindingClosureReadModel> {
  if (!actor) {
    throw new UnifiedCrmPilotFindingClosureError(
      "AUTHENTICATION_REQUIRED",
      "Sign in before opening CRM pilot finding closure."
    );
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmPilotFindingClosureError(
      "PILOT_FINDING_CLOSURE_NOT_AUTHORIZED",
      "CRM pilot finding closure is available to the manager workspace."
    );
  }
  const findings = pendingFindings.map((finding) => ({
    ...finding,
    closureEvidence: [...finding.closureEvidence]
  }));
  const ready = isReleaseCandidateReady(findings);
  return {
    closureDecision: ready ? "READY_FOR_RELEASE_CANDIDATE_VALIDATION" : "HELD",
    contractVersion: UNIFIED_CRM_PILOT_FINDING_CLOSURE_CONTRACT_VERSION,
    enabledScope: ready ? ["internal-manager-crm-readiness-review"] : [],
    findings,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    requiredBeforeReleaseCandidateValidation: [...requiredBeforeReleaseCandidateValidation],
    visibility: "management"
  };
}
