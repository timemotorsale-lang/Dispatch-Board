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
  operatingBoundary: "Read-only MVP foundation. No high-risk sales actions are authorized.",
  principles: [
    {
      name: "Narrow scope",
      meaning: "Build the smallest console that is useful every day."
    },
    {
      name: "Enterprise shape",
      meaning: "Use permanent navigation, data boundaries, permissions, and audit posture."
    },
    {
      name: "Read first",
      meaning: "Start with trusted visibility before commands."
    },
    {
      name: "No risky writes",
      meaning: "Avoid customer messaging, quotes, vehicle holds, finance decisions, and discount approvals."
    },
    {
      name: "Expand cleanly",
      meaning: "Every MVP section should map to future workflows without rework."
    },
    {
      name: "Manager-visible",
      meaning: "The MVP must help managers see risk early, not only help salespeople view tasks."
    }
  ]
} as const;

export type SalesConsoleMvpDefinition = typeof salesConsoleMvpDefinition;
