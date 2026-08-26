import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_PILOT_EXECUTION_CONTRACT_VERSION,
  UnifiedCrmPilotExecutionError,
  type UnifiedCrmPilotExecutionReadModel,
  type UnifiedCrmPilotExecutionWorkflow
} from "@/server/unified-crm/pilot-execution-contract";

type Dependencies = {
  now?: () => Date;
};

const workflows: UnifiedCrmPilotExecutionWorkflow[] = [
  {
    title: "managerDailyReview",
    owner: "operations",
    status: "READY_TO_RUN",
    evidenceRequired: "Manager opens CRM Home, reviews exception gates, and records whether daily priorities are explainable."
  },
  {
    title: "staffFollowUp",
    owner: "sales",
    status: "READY_TO_RUN",
    evidenceRequired: "Staff member completes an owned follow-up using CRM context and source-system fallback."
  },
  {
    title: "globalSearch",
    owner: "sales",
    status: "READY_TO_RUN",
    evidenceRequired: "Pilot user finds customer/opportunity/vehicle context from global CRM search without unauthorized records."
  },
  {
    title: "opportunityProgression",
    owner: "sales",
    status: "READY_TO_RUN",
    evidenceRequired: "Pilot user advances an opportunity stage with current version and reason evidence."
  },
  {
    title: "quoteGovernance",
    owner: "management",
    status: "READY_TO_RUN",
    evidenceRequired: "Manager reviews quote draft/version/approval evidence for one pilot opportunity."
  },
  {
    title: "dispatchHandoff",
    owner: "operations",
    status: "READY_TO_RUN",
    evidenceRequired: "CRM-linked operational handoff remains source-authoritative and reversible."
  },
  {
    title: "savedViews",
    owner: "sales",
    status: "READY_TO_RUN",
    evidenceRequired: "Pilot user saves and reloads a personal CRM view; manager verifies shared team view behavior."
  }
];

const reportingRequirements = [
  "Record participant, workflow, record IDs, timestamp, outcome, friction, and defect severity.",
  "Separate product friction from correctness defects.",
  "Do not expand release scope from pilot outcomes without UCRM-069 decision.",
  "Escalate suspected privacy, irreversible mutation, or data correctness issues immediately."
];

const measures = [
  "Workflow completion rate",
  "Time to find customer/opportunity context",
  "Incorrect or missing source data count",
  "User friction themes",
  "Defect severity and owner",
  "Rollback or fallback usage"
];

export async function getUnifiedCrmPilotExecution(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmPilotExecutionReadModel> {
  if (!actor) {
    throw new UnifiedCrmPilotExecutionError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM pilot execution.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmPilotExecutionError(
      "PILOT_EXECUTION_NOT_AUTHORIZED",
      "CRM pilot execution is available to the manager workspace."
    );
  }
  const pilotWorkflows = workflows.map((workflow) => ({ ...workflow }));
  return {
    contractVersion: UNIFIED_CRM_PILOT_EXECUTION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    measures: [...measures],
    pilotStatus: pilotWorkflows.some((workflow) => workflow.status === "HELD") ? "HELD" : "READY_TO_RUN",
    releaseScope: "INTERNAL_PILOT_ONLY",
    reportingRequirements: [...reportingRequirements],
    visibility: "management",
    workflows: pilotWorkflows
  };
}
