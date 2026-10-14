export const salesConsoleM21ManagerReviewResolutionPlanning = {
  milestone: "Milestone 21 — Manager Review Resolution Planning",
  activationState: "planning-only",
  guardrailCopy:
    "Managers can review request context, but resolution commands remain planned until return/close/audit behavior is separately approved.",
  resolutionStates: [
    "open",
    "reviewing",
    "needs source verification",
    "returned to salesperson",
    "resolved",
    "canceled"
  ],
  plannedControls: [
    { control: "Return to salesperson", enabled: false, risk: "Could alter staff workflow and needs notification/audit rules." },
    { control: "Mark reviewed", enabled: false, risk: "Could imply approval without resolution policy." },
    { control: "Request more information", enabled: false, risk: "Could create messaging/task routing until explicitly designed." },
    { control: "Close review", enabled: false, risk: "Could hide unresolved source-system concerns." }
  ],
  blockedApprovals: [
    "Discount approval remains blocked",
    "Finance approval remains blocked",
    "Quote approval remains blocked",
    "Customer-facing messages remain blocked"
  ]
} as const;

export function salesConsoleM21DefinesResolutionStates() {
  return salesConsoleM21ManagerReviewResolutionPlanning.resolutionStates.includes("needs source verification");
}

export function salesConsoleM21ResolutionControlsRemainDisabled() {
  return salesConsoleM21ManagerReviewResolutionPlanning.plannedControls.every((control) => control.enabled === false);
}

export function salesConsoleM21KeepsRiskyApprovalsBlocked() {
  return salesConsoleM21ManagerReviewResolutionPlanning.blockedApprovals.includes("Discount approval remains blocked");
}
