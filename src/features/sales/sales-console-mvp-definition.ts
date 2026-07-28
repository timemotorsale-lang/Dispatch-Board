export const salesConsoleMvpDefinition = {
  goal: "Build a stable MVP console with an enterprise foundation that can expand later.",
  includedCapabilities: [
    "Stable /sales operating surface",
    "Approved enterprise layout and navigation",
    "Read-only visibility into sales work, leads, deals, inventory fit, and manager risk",
    "Role-aware access and sensitive-action guardrails",
    "Expansion path for opportunity workflow, deal desk, approvals, finance handoff, and reporting"
  ],
  excludedCapabilities: [
    "Customer messaging automation",
    "Quote submission",
    "Vehicle holds or reservations",
    "Finance decisions",
    "Discount approvals"
  ],
  operatingBoundary: "Read-only MVP foundation. No high-risk sales actions are authorized."
} as const;

export type SalesConsoleMvpDefinition = typeof salesConsoleMvpDefinition;
