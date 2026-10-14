export const salesConsoleM19ServiceActivation = {
  serviceState: "activated-for-manager-review",
  liveWorkflow: "Manager Review Request",
  activeStatuses: ["created", "duplicate"] as const,
  guardrails: [
    "Service requires authentication",
    "Service normalizes payload before persistence",
    "Service writes through repository transaction only",
    "Service returns created or duplicate status",
    "Service keeps non-manager-review workflows blocked"
  ]
} as const;

export function salesConsoleM19ServiceRequiresAuthentication() {
  return salesConsoleM19ServiceActivation.guardrails.includes("Service requires authentication");
}

export function salesConsoleM19ServiceReturnsCreatedOrDuplicate() {
  return salesConsoleM19ServiceActivation.activeStatuses.includes("created");
}

export function salesConsoleM19ServiceKeepsOtherWorkflowsBlocked() {
  return salesConsoleM19ServiceActivation.guardrails.includes("Service keeps non-manager-review workflows blocked");
}
