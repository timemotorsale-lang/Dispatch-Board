export type SalesConsoleM27RoleUx = {
  role: "Salesperson" | "Sales Manager" | "BDC / Lead Coordinator" | "Admin / Owner";
  landingFocus: string;
  firstThirtySeconds: string;
  emptyState: string;
  unavailableState: string;
  managerReviewEntry: "visible" | "workbench" | "intake-context" | "admin-summary";
  blockedActionCopy: string;
};

export const salesConsoleM27StaffDeploymentUxFinalization = {
  milestone: "Milestone 27 - Staff Deployment UX Finalization",
  deploymentPosture: "staff-operational",
  operatingSummary: "Each staff role lands on a useful daily view with source labels, clear next steps, and safe Manager Review Request guidance.",
  roleUx: [
    {
      role: "Salesperson",
      landingFocus: "Start with today's highest-priority customers, blockers, source freshness, and Manager Review Request when a manager decision is needed.",
      firstThirtySeconds: "Open Salesperson Today, scan urgent blockers, verify stale/source-marked rows, and submit Manager Review Request only when required fields are present.",
      emptyState: "No priority seller work is visible right now. Check the CRM/source queue before assuming the day is clear.",
      unavailableState: "If a customer, deal, or inventory record is unavailable, use the named source system and do not act from fallback data alone.",
      managerReviewEntry: "visible",
      blockedActionCopy: "Quotes, discounts, finance decisions, vehicle holds, and customer messages stay in their approved source systems."
    },
    {
      role: "Sales Manager",
      landingFocus: "Start with incoming Manager Review Requests, team blockers, stale deal context, and source verification gaps.",
      firstThirtySeconds: "Open Manager Command Center, check the review workbench, triage high-risk requests, and verify source links before responding.",
      emptyState: "No manager review work is waiting. Monitor team blockers and source freshness before leaving the console.",
      unavailableState: "Unavailable request context means the manager should verify the CRM/DMS/source record before coaching or deciding outside the console.",
      managerReviewEntry: "workbench",
      blockedActionCopy: "Resolution, discount, quote, finance, and hold controls remain unavailable until separately approved."
    },
    {
      role: "BDC / Lead Coordinator",
      landingFocus: "Start with lead leakage, duplicate risk, assignment gaps, response SLA, and source-owned customer records.",
      firstThirtySeconds: "Open Lead Operations, clear assignment visibility gaps, verify duplicate warnings, and route manager questions through source notes.",
      emptyState: "No lead operations risk is visible. Confirm the CRM lead queue before assuming all follow-up is covered.",
      unavailableState: "Unavailable lead details must be checked in CRM or the lead source before outreach decisions are made.",
      managerReviewEntry: "intake-context",
      blockedActionCopy: "Automated messaging and customer outreach actions remain outside this MVP console."
    },
    {
      role: "Admin / Owner",
      landingFocus: "Start with deployment health, role coverage, risky workflow guardrails, audit/idempotency status, and support ownership.",
      firstThirtySeconds: "Open rollout readiness, confirm roles and manager reviewers, then check whether blocked workflows remain blocked.",
      emptyState: "No deployment blocker is visible. Continue monitoring issue reports, source freshness, and Manager Review Request health.",
      unavailableState: "Unavailable readiness evidence should block broader rollout until the owning source or support owner verifies it.",
      managerReviewEntry: "admin-summary",
      blockedActionCopy: "Admin views can review evidence but do not unlock broad writes, CRM replacement, finance decisions, or approvals."
    }
  ] satisfies SalesConsoleM27RoleUx[],
  staffDeviceTargets: ["desktop manager workstation", "sales desk laptop", "tablet-width review"],
  sourceHonestyLabels: ["current", "stale", "unavailable", "verify-first", "fallback/source-shaped"],
  stillBlockedWorkflows: ["customer messaging automation", "quote submission", "vehicle holds/reservations", "finance decisions", "discount approvals"]
} as const;

export function salesConsoleM27CoversCoreRoleUx() {
  return salesConsoleM27StaffDeploymentUxFinalization.roleUx.map((role) => role.role).join("|") ===
    "Salesperson|Sales Manager|BDC / Lead Coordinator|Admin / Owner";
}

export function salesConsoleM27EveryRoleHasFirstThirtySecondGuidance() {
  return salesConsoleM27StaffDeploymentUxFinalization.roleUx.every((role) => role.firstThirtySeconds.length > 60);
}

export function salesConsoleM27KeepsRiskyWorkflowsBlocked() {
  return salesConsoleM27StaffDeploymentUxFinalization.stillBlockedWorkflows.includes("finance decisions") &&
    salesConsoleM27StaffDeploymentUxFinalization.stillBlockedWorkflows.includes("discount approvals") &&
    salesConsoleM27StaffDeploymentUxFinalization.roleUx.every((role) => role.blockedActionCopy.length > 40);
}

export function salesConsoleM27SourceStatesAreStaffReadable() {
  return salesConsoleM27StaffDeploymentUxFinalization.sourceHonestyLabels.includes("verify-first") &&
    salesConsoleM27StaffDeploymentUxFinalization.sourceHonestyLabels.includes("fallback/source-shaped");
}
