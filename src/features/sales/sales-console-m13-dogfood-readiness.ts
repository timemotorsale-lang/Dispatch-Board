export type SalesConsoleM13DogfoodAudience = {
  label: string;
  participation: "include" | "wait";
  reason: string;
};

export const salesConsoleM13DogfoodReadiness = {
  approvalStatus: "owner-review-required",
  dogfoodStatus: "ready-for-controlled-review",
  rollbackNote: "If staff report confusing role views, misleading source labels, or accidental action affordances, pause dogfood and return users to source systems.",
  safeToUse: [
    "Read-only role landing experiences",
    "Salesperson Today priority review",
    "Lead Operations visibility",
    "Manager Command Center risk review",
    "Deal Desk visibility",
    "Inventory Intelligence visibility",
    "Source/freshness labels"
  ],
  stillDisabled: [
    "Customer messaging automation",
    "Quote submission",
    "Vehicle holds/reservations",
    "Finance decisions",
    "Discount approvals",
    "CRM/DMS/source-system writes"
  ],
  audience: [
    {
      label: "Salesperson",
      participation: "include",
      reason: "Can validate whether Today, Deal Desk, Inventory, and source labels help daily selling."
    },
    {
      label: "Sales Manager",
      participation: "include",
      reason: "Can validate team risk, blocked work, and manager review placeholder clarity."
    },
    {
      label: "BDC / Lead Coordinator",
      participation: "include",
      reason: "Can validate lead SLA, assignment, duplicate-review, and appointment visibility."
    },
    {
      label: "Admin / Owner",
      participation: "include",
      reason: "Can approve dogfood scope, monitor readiness, and decide pause/continue."
    },
    {
      label: "Finance Visibility",
      participation: "wait",
      reason: "Should wait until finance privacy and handoff labels are reviewed."
    },
    {
      label: "Marketing / Advertising Visibility",
      participation: "wait",
      reason: "Should wait until CRM, advertising, and marketing console boundaries are clearer."
    },
    {
      label: "Office / Operations Visibility",
      participation: "wait",
      reason: "Should wait until customer/CRM console boundaries are clearer."
    }
  ] as const satisfies readonly SalesConsoleM13DogfoodAudience[]
} as const;

export function salesConsoleM13DogfoodReadinessKeepsWritesDisabled() {
  return salesConsoleM13DogfoodReadiness.stillDisabled.length >= 6 &&
    salesConsoleM13DogfoodReadiness.stillDisabled.every((item) =>
      item.includes("submission") ||
      item.includes("decisions") ||
      item.includes("writes") ||
      item.includes("holds") ||
      item.includes("approvals") ||
      item.includes("messaging")
    );
}

export function salesConsoleM13DogfoodAudienceIsControlled() {
  const included = salesConsoleM13DogfoodReadiness.audience.filter((item) => item.participation === "include");
  const waiting = salesConsoleM13DogfoodReadiness.audience.filter((item) => item.participation === "wait");

  return included.length === 4 && waiting.length === 3;
}

export function salesConsoleM13DogfoodRequiresOwnerReview() {
  return salesConsoleM13DogfoodReadiness.approvalStatus === "owner-review-required";
}
