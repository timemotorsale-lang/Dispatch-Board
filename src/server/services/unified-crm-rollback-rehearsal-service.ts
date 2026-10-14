import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_ROLLBACK_REHEARSAL_CONTRACT_VERSION,
  UnifiedCrmRollbackRehearsalError,
  type UnifiedCrmRollbackRehearsalReadModel,
  type UnifiedCrmRollbackRehearsalStep
} from "@/server/unified-crm/rollback-rehearsal-contract";

type Dependencies = {
  now?: () => Date;
};

const steps: UnifiedCrmRollbackRehearsalStep[] = [
  {
    title: "killSwitches",
    owner: "engineering",
    status: "READY_TO_REHEARSE",
    evidenceRequired: "Confirm CRM review/enablement flags can disable CRM entry points without disabling source Customers, Sales, Tasks, or vehicle operations."
  },
  {
    title: "priorReleaseRecovery",
    owner: "engineering",
    status: "READY_TO_REHEARSE",
    evidenceRequired: "Record the prior release commit, migration boundary, restore command owner, and expected recovery sequence."
  },
  {
    title: "inFlightWrites",
    owner: "engineering",
    status: "READY_TO_REHEARSE",
    evidenceRequired: "Rehearse idempotency replay and stale-version handling for CRM commands started before rollback."
  },
  {
    title: "retainedEvidence",
    owner: "operations",
    status: "READY_TO_REHEARSE",
    evidenceRequired: "Preserve command ledger, audit events, pilot data-load rehearsal reports, and manager gate reports after rollback."
  },
  {
    title: "customersSalesFallback",
    owner: "operations",
    status: "READY_TO_REHEARSE",
    evidenceRequired: "Confirm staff can continue Customers, Sales, Tasks, and appointment workflows without CRM navigation."
  },
  {
    title: "restoreTiming",
    owner: "engineering",
    status: "HELD",
    evidenceRequired: "Attach measured backup and restore timings from a release-candidate rehearsal."
  },
  {
    title: "decisionLog",
    owner: "product",
    status: "HELD",
    evidenceRequired: "Record who can trigger rollback, exact conditions, communication owner, and post-rollback review process."
  }
];

export async function getUnifiedCrmRollbackRehearsal(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmRollbackRehearsalReadModel> {
  if (!actor) {
    throw new UnifiedCrmRollbackRehearsalError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM rollback rehearsal.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmRollbackRehearsalError(
      "ROLLBACK_REHEARSAL_NOT_AUTHORIZED",
      "CRM rollback rehearsal is available to the manager workspace."
    );
  }
  const rehearsalSteps = steps.map((step) => ({ ...step }));
  return {
    contractVersion: UNIFIED_CRM_ROLLBACK_REHEARSAL_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rehearsalStatus: rehearsalSteps.some((step) => step.status === "HELD") ? "HELD" : "READY_TO_REHEARSE",
    steps: rehearsalSteps,
    visibility: "management"
  };
}
