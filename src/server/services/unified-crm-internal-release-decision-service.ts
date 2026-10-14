import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_INTERNAL_RELEASE_DECISION_CONTRACT_VERSION,
  UnifiedCrmInternalReleaseDecisionError,
  type UnifiedCrmInternalReleaseDecisionReadModel
} from "@/server/unified-crm/internal-release-decision-contract";

type Dependencies = {
  now?: () => Date;
};

const requiredBeforeEnablement = [
  "Approve UCRM-069 pilot go/no-go with exact flags and blockers.",
  "Close UCRM-070 pilot findings by fixing, accepting, or removing each from enabled scope.",
  "Validate UCRM-071 against the exact release-candidate commit and production configuration.",
  "Confirm UCRM-072 operational handoff owners and rollback authority.",
  "Record the evidence commit, migration version, approved cohorts, capabilities, known limitations, and rollback trigger."
];

export async function getUnifiedCrmInternalReleaseDecision(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmInternalReleaseDecisionReadModel> {
  if (!actor) {
    throw new UnifiedCrmInternalReleaseDecisionError(
      "AUTHENTICATION_REQUIRED",
      "Sign in before opening CRM internal release decision."
    );
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmInternalReleaseDecisionError(
      "INTERNAL_RELEASE_DECISION_NOT_AUTHORIZED",
      "CRM internal release decision is available to the manager workspace."
    );
  }
  return {
    approvedCapabilities: [],
    approvedCohorts: [],
    contractVersion: UNIFIED_CRM_INTERNAL_RELEASE_DECISION_CONTRACT_VERSION,
    decision: "HELD",
    evidenceCommit: "pending",
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    knownLimitations: [],
    migrationVersion: "pending",
    requiredBeforeEnablement: [...requiredBeforeEnablement],
    rollbackTrigger: "pending",
    visibility: "management"
  };
}
