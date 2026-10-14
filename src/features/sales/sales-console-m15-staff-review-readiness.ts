import {
  salesConsoleM15EmptyStatesCoverOperatingSections,
  salesConsoleM15EmptyStatesRemainReadOnly
} from "./sales-console-m15-empty-state-clarity";
import {
  salesConsoleM15ManagerCommandHasDailyPriorities,
  salesConsoleM15ManagerCommandRemainsReadOnly
} from "./sales-console-m15-manager-command-polish";
import {
  salesConsoleM15OperatingPolishCoversDailySections,
  salesConsoleM15OperatingPolishRemainsReadOnly
} from "./sales-console-m15-operating-section-polish";
import {
  salesConsoleM15RoleNavigationCoversCoreRoles,
  salesConsoleM15RoleNavigationRemainsReadOnly
} from "./sales-console-m15-role-first-navigation";

export type SalesConsoleM15StaffReviewReadinessGate = {
  evidence: string;
  gate: string;
  status: "ready" | "review";
};

export const salesConsoleM15StaffReviewReadiness = {
  gates: [
    {
      evidence: "Core roles have a visible start path and internal next section.",
      gate: "Role-first navigation",
      status: salesConsoleM15RoleNavigationCoversCoreRoles() ? "ready" : "review"
    },
    {
      evidence: "Daily operating sections explain staff use, scan targets, and verification rules.",
      gate: "Operating section clarity",
      status: salesConsoleM15OperatingPolishCoversDailySections() ? "ready" : "review"
    },
    {
      evidence: "Empty, stale, unavailable, and verify-first labels explain what staff should check next.",
      gate: "Fallback clarity",
      status: salesConsoleM15EmptyStatesCoverOperatingSections() ? "ready" : "review"
    },
    {
      evidence: "Manager daily command priorities summarize approvals visibility, lead leakage, stale work, and vehicle readiness.",
      gate: "Manager daily command",
      status: salesConsoleM15ManagerCommandHasDailyPriorities() ? "ready" : "review"
    },
    {
      evidence: "M15 remains read-only across navigation, operating sections, empty states, and manager command.",
      gate: "Read-only guardrails",
      status: salesConsoleM15RoleNavigationRemainsReadOnly() &&
        salesConsoleM15OperatingPolishRemainsReadOnly() &&
        salesConsoleM15EmptyStatesRemainReadOnly() &&
        salesConsoleM15ManagerCommandRemainsReadOnly()
        ? "ready"
        : "review"
    }
  ] as const satisfies readonly SalesConsoleM15StaffReviewReadinessGate[],
  reviewRecommendation: "Safe for another staff review pass after merge; still not a write-enabled release.",
  readOnly: true
} as const;

export function salesConsoleM15StaffReviewGatesAreReady() {
  return salesConsoleM15StaffReviewReadiness.gates.every((gate) => gate.status === "ready");
}

export function salesConsoleM15StaffReviewKeepsReadOnlyBoundary() {
  return salesConsoleM15StaffReviewReadiness.readOnly &&
    salesConsoleM15StaffReviewReadiness.reviewRecommendation.includes("not a write-enabled release");
}

export function salesConsoleM15StaffReviewCoversReleaseConcerns() {
  return salesConsoleM15StaffReviewReadiness.gates.length === 5;
}
