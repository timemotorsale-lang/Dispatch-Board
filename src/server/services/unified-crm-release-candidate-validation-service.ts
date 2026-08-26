import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_RELEASE_CANDIDATE_VALIDATION_CONTRACT_VERSION,
  UnifiedCrmReleaseCandidateValidationError,
  type UnifiedCrmReleaseCandidateEvidence,
  type UnifiedCrmReleaseCandidateValidationReadModel
} from "@/server/unified-crm/release-candidate-validation-contract";

type Dependencies = {
  now?: () => Date;
};

const evidence: UnifiedCrmReleaseCandidateEvidence[] = [
  {
    evidenceId: "UCRM-RC-060",
    milestone: "UCRM-060",
    owner: "data-migration",
    status: "NEEDS_RERUN",
    requiredAction: "Rerun the pilot data load rehearsal against the exact release-candidate source file."
  },
  {
    evidenceId: "UCRM-RC-061",
    milestone: "UCRM-061",
    owner: "security-review",
    status: "HELD",
    requiredAction: "Resolve or formally reduce scope for the named security holds before validation."
  },
  {
    evidenceId: "UCRM-RC-062",
    milestone: "UCRM-062",
    owner: "engineering",
    status: "NEEDS_RERUN",
    requiredAction: "Confirm concurrency, recovery, dependency, and job-lease evidence against production configuration."
  },
  {
    evidenceId: "UCRM-RC-063",
    milestone: "UCRM-063",
    owner: "ux-review",
    status: "NEEDS_RERUN",
    requiredAction: "Complete authenticated accessibility and responsive review on desktop and mobile."
  },
  {
    evidenceId: "UCRM-RC-064",
    milestone: "UCRM-064",
    owner: "observability",
    status: "NEEDS_RERUN",
    requiredAction: "Capture release-candidate SLO, latency, freshness, alert, and log evidence."
  },
  {
    evidenceId: "UCRM-RC-065",
    milestone: "UCRM-065",
    owner: "engineering",
    status: "HELD",
    requiredAction: "Clear full typecheck/build/browser/Dispatch regression holds on one release-candidate commit."
  },
  {
    evidenceId: "UCRM-RC-066",
    milestone: "UCRM-066",
    owner: "operations",
    status: "NEEDS_RERUN",
    requiredAction: "Confirm the pilot operations package has owner acceptance for the release candidate."
  },
  {
    evidenceId: "UCRM-RC-067",
    milestone: "UCRM-067",
    owner: "operations",
    status: "HELD",
    requiredAction: "Complete measured rollback rehearsal and authority signoff before validation."
  }
];

export async function getUnifiedCrmReleaseCandidateValidation(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmReleaseCandidateValidationReadModel> {
  if (!actor) {
    throw new UnifiedCrmReleaseCandidateValidationError(
      "AUTHENTICATION_REQUIRED",
      "Sign in before opening CRM release-candidate validation."
    );
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmReleaseCandidateValidationError(
      "RELEASE_CANDIDATE_VALIDATION_NOT_AUTHORIZED",
      "CRM release-candidate validation is available to the manager workspace."
    );
  }
  const rows = evidence.map((row) => ({ ...row }));
  const validated = rows.every((row) => row.status === "CONFIRMED_CURRENT");
  return {
    contractVersion: UNIFIED_CRM_RELEASE_CANDIDATE_VALIDATION_CONTRACT_VERSION,
    evidence: rows,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    releaseCandidate: {
      configuration: "production",
      exactCommit: "pending",
      migrationVersion: "pending"
    },
    validationDecision: validated ? "VALIDATED" : "HELD",
    visibility: "management"
  };
}
