export type SalesConsoleM16WorkflowCandidate = {
  activationPosture: "disabled-planning" | "not-selected";
  candidate: string;
  rationale: string;
  risk: "low" | "medium" | "high";
};

export const salesConsoleM16WorkflowSelection = {
  candidates: [
    {
      activationPosture: "disabled-planning",
      candidate: "Manager Review Request",
      rationale: "Useful immediately, internal-only, naturally audited, and does not contact customers or change deal terms.",
      risk: "low"
    },
    {
      activationPosture: "not-selected",
      candidate: "Customer Messaging",
      rationale: "Customer-facing communication requires consent, templates, opt-out handling, and compliance review.",
      risk: "high"
    },
    {
      activationPosture: "not-selected",
      candidate: "Quote Submission",
      rationale: "Quote submission can affect customer expectations, deal terms, lender context, and audit obligations.",
      risk: "high"
    },
    {
      activationPosture: "not-selected",
      candidate: "Vehicle Holds / Reservations",
      rationale: "Inventory commitment can block real store operations and requires expiration, conflict, and manager rules.",
      risk: "high"
    },
    {
      activationPosture: "not-selected",
      candidate: "Finance Decisions / Discount Approvals",
      rationale: "Finance and discount decisions require strict permissions, source verification, audit, and policy controls.",
      risk: "high"
    }
  ] as const satisfies readonly SalesConsoleM16WorkflowCandidate[],
  selectedWorkflow: "Manager Review Request",
  readOnlyPlanningOnly: true
} as const;

export function salesConsoleM16SelectsManagerReviewFirst() {
  return salesConsoleM16WorkflowSelection.selectedWorkflow === "Manager Review Request" &&
    salesConsoleM16WorkflowSelection.candidates.some((candidate) =>
      candidate.candidate === "Manager Review Request" &&
      candidate.activationPosture === "disabled-planning" &&
      candidate.risk === "low"
    );
}

export function salesConsoleM16RiskyWorkflowsRemainNotSelected() {
  return salesConsoleM16WorkflowSelection.candidates
    .filter((candidate) => candidate.candidate !== "Manager Review Request")
    .every((candidate) => candidate.activationPosture === "not-selected" && candidate.risk === "high");
}

export function salesConsoleM16WorkflowSelectionRemainsPlanningOnly() {
  return salesConsoleM16WorkflowSelection.readOnlyPlanningOnly &&
    salesConsoleM16WorkflowSelection.candidates.every((candidate) =>
      candidate.activationPosture === "disabled-planning" || candidate.activationPosture === "not-selected"
    );
}
