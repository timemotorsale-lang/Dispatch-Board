export const salesConsoleM23StaffDeploymentReadiness = {
  milestone: "Milestone 23 — Staff Deployment Readiness",
  rolloutState: "controlled-staff-rollout-ready",
  pilotSupportOwner: "Admin / Owner",
  checklist: [
    { item: "roles verified", status: "ready" },
    { item: "managers assigned", status: "ready" },
    { item: "staff know Manager Review Request behavior", status: "ready" },
    { item: "excluded actions communicated", status: "ready" },
    { item: "fallback/source labels understood", status: "ready" },
    { item: "pilot support owner named", status: "ready" }
  ],
  roleReadiness: [
    {
      role: "Salesperson",
      startHere: "Salesperson Today and Deal Desk Manager Review Request",
      canDo: "Submit Manager Review Request with complete source fields.",
      cannotDo: "Cannot send messages, submit quotes, reserve vehicles, approve discounts, or decide finance."
    },
    {
      role: "Sales Manager",
      startHere: "Manager Command Center and Manager Review Workbench",
      canDo: "View incoming manager review work and verify source context.",
      cannotDo: "Cannot resolve review, approve discount, approve finance, or submit quote from Sales Console."
    },
    {
      role: "BDC / Lead Coordinator",
      startHere: "Lead Operations",
      canDo: "Review lead leakage, SLA risk, and source context.",
      cannotDo: "Cannot automate customer messaging or replace CRM lead ownership."
    },
    {
      role: "Admin / Owner",
      startHere: "Readiness, release gates, and guardrail panels",
      canDo: "Review pilot readiness, support staff, and monitor blocked workflows.",
      cannotDo: "Cannot bypass release gates for risky enterprise workflows."
    }
  ]
} as const;

export function salesConsoleM23ChecklistReady() {
  return salesConsoleM23StaffDeploymentReadiness.checklist.every((item) => item.status === "ready");
}

export function salesConsoleM23CoversCoreStaffRoles() {
  return salesConsoleM23StaffDeploymentReadiness.roleReadiness.map((role) => role.role).join("|").includes("BDC / Lead Coordinator");
}

export function salesConsoleM23CommunicatesExcludedActions() {
  return salesConsoleM23StaffDeploymentReadiness.checklist.some((item) => item.item === "excluded actions communicated");
}
