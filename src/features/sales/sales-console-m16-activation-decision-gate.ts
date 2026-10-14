import {
  salesConsoleM16AuditGuardrailsRemainPlanningOnly,
  salesConsoleM16AuditReadinessCoversRequestShape,
  salesConsoleM16ExcludedActionsRemainBlocked
} from "./sales-console-m16-audit-guardrails";
import {
  salesConsoleM16ManagerReviewContractHasAuditShape,
  salesConsoleM16ManagerReviewContractHasPermissions,
  salesConsoleM16ManagerReviewContractHasRequiredFields,
  salesConsoleM16ManagerReviewContractRemainsDisabled
} from "./sales-console-m16-manager-review-contract";
import {
  salesConsoleM16ManagerReviewPreviewIsDisabled,
  salesConsoleM16ManagerReviewPreviewLivesInDealDesk,
  salesConsoleM16ManagerReviewPreviewShowsUnavailableStates
} from "./sales-console-m16-manager-review-disabled-preview";
import {
  salesConsoleM16RiskyWorkflowsRemainNotSelected,
  salesConsoleM16SelectsManagerReviewFirst,
  salesConsoleM16WorkflowSelectionRemainsPlanningOnly
} from "./sales-console-m16-workflow-selection";

export type SalesConsoleM16ActivationGate = {
  evidence: string;
  gate: string;
  status: "ready-for-m17-planning" | "blocked";
};

const allM16PlanningChecksPass =
  salesConsoleM16SelectsManagerReviewFirst() &&
  salesConsoleM16RiskyWorkflowsRemainNotSelected() &&
  salesConsoleM16WorkflowSelectionRemainsPlanningOnly() &&
  salesConsoleM16ManagerReviewContractHasRequiredFields() &&
  salesConsoleM16ManagerReviewContractHasPermissions() &&
  salesConsoleM16ManagerReviewContractHasAuditShape() &&
  salesConsoleM16ManagerReviewContractRemainsDisabled() &&
  salesConsoleM16ManagerReviewPreviewIsDisabled() &&
  salesConsoleM16ManagerReviewPreviewShowsUnavailableStates() &&
  salesConsoleM16ManagerReviewPreviewLivesInDealDesk() &&
  salesConsoleM16AuditReadinessCoversRequestShape() &&
  salesConsoleM16ExcludedActionsRemainBlocked() &&
  salesConsoleM16AuditGuardrailsRemainPlanningOnly();

export const salesConsoleM16ActivationDecisionGate = {
  gates: [
    {
      evidence: "Manager Review Request is selected as first low-risk candidate and other workflows remain not selected.",
      gate: "Workflow selection",
      status: salesConsoleM16SelectsManagerReviewFirst() && salesConsoleM16RiskyWorkflowsRemainNotSelected() ? "ready-for-m17-planning" : "blocked"
    },
    {
      evidence: "Contract defines required fields, permissions, unavailable states, and audit shape.",
      gate: "Contract completeness",
      status: salesConsoleM16ManagerReviewContractHasRequiredFields() &&
        salesConsoleM16ManagerReviewContractHasPermissions() &&
        salesConsoleM16ManagerReviewContractHasAuditShape()
        ? "ready-for-m17-planning"
        : "blocked"
    },
    {
      evidence: "Deal Desk preview is visible but disabled with unavailable-state guidance.",
      gate: "Disabled preview",
      status: salesConsoleM16ManagerReviewPreviewIsDisabled() &&
        salesConsoleM16ManagerReviewPreviewShowsUnavailableStates()
        ? "ready-for-m17-planning"
        : "blocked"
    },
    {
      evidence: "Messaging, quote submission, vehicle holds, finance decisions, and discount approvals remain blocked.",
      gate: "Excluded workflows",
      status: salesConsoleM16ExcludedActionsRemainBlocked() ? "ready-for-m17-planning" : "blocked"
    }
  ] as const satisfies readonly SalesConsoleM16ActivationGate[],
  m17Recommendation: allM16PlanningChecksPass
    ? "M17 may plan controlled activation, but M16 does not enable the workflow."
    : "Do not proceed to activation planning until M16 gaps are resolved.",
  workflowLive: false
} as const;

export function salesConsoleM16ActivationGateReadyForM17Planning() {
  return salesConsoleM16ActivationDecisionGate.gates.every((gate) => gate.status === "ready-for-m17-planning");
}

export function salesConsoleM16ActivationGateKeepsWorkflowDisabled() {
  return salesConsoleM16ActivationDecisionGate.workflowLive === false &&
    salesConsoleM16ActivationDecisionGate.m17Recommendation.includes("does not enable");
}

export function salesConsoleM16ActivationGateCoversCoreConcerns() {
  return salesConsoleM16ActivationDecisionGate.gates.length === 4;
}
