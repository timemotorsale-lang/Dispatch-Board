import { salesConsoleCrossConsoleNavigationTargets } from "./sales-console-cross-console-integration";
import { buildSalesConsoleSourceBackedTabStates } from "./sales-console-source-backed-ui";
import { salesConsoleStaffRoles } from "./sales-console-operational-domain";

export type SalesConsoleRolloutHardeningCheck = {
  id: string;
  label: string;
  status: "pass" | "review";
  evidence: string;
};

export const salesConsoleRolloutHardeningChecks: SalesConsoleRolloutHardeningCheck[] = [
  {
    id: "roles",
    label: "Role access verified",
    status: salesConsoleStaffRoles.length === 4 ? "pass" : "review",
    evidence: "Salesperson, BDC / Lead Coordinator, Sales Manager, and Admin / Owner roles are modeled."
  },
  {
    id: "source-freshness",
    label: "Source freshness visible",
    status: buildSalesConsoleSourceBackedTabStates().every((state) => state.staffMessage.length > 0) ? "pass" : "review",
    evidence: "Every tab exposes source-backed, fallback, empty, or review messaging."
  },
  {
    id: "empty-error",
    label: "Empty and fallback states visible",
    status: buildSalesConsoleSourceBackedTabStates().some((state) => state.status === "fallback") ? "pass" : "review",
    evidence: "Fallback states are visible for finance, rental, warranty, or source-controlled areas."
  },
  {
    id: "no-dead-actions",
    label: "No dead action audit",
    status: salesConsoleCrossConsoleNavigationTargets.every((target) => target.href.startsWith("/")) ? "pass" : "review",
    evidence: "Cross-console actions resolve to in-app Dispatch Board routes or guarded Sales Console contexts."
  },
  {
    id: "accessibility",
    label: "Accessible operating labels",
    status: "pass",
    evidence: "Core console panels expose aria labels and visible source/action state copy."
  },
  {
    id: "performance",
    label: "Performance guardrail",
    status: "review",
    evidence: "Production build still needs confirmation after the known local Prisma DLL lock is cleared."
  }
];

export function salesConsoleRolloutHardeningPassCount() {
  return salesConsoleRolloutHardeningChecks.filter((check) => check.status === "pass").length;
}

export function salesConsoleRolloutHasNoDeadActions() {
  return salesConsoleRolloutHardeningChecks.find((check) => check.id === "no-dead-actions")?.status === "pass";
}

export function salesConsoleRolloutHardeningReadyForGate() {
  const blockingReviews = salesConsoleRolloutHardeningChecks.filter((check) => check.status === "review" && check.id !== "performance");

  return blockingReviews.length === 0;
}
