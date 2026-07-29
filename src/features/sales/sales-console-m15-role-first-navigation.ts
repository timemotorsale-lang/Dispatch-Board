export type SalesConsoleM15RoleNavigationItem = {
  guardrail: string;
  nextSection: string;
  primarySection: string;
  role: "salesperson" | "sales-manager" | "bdc-lead-coordinator" | "admin-owner";
  staffCue: string;
};

export const salesConsoleM15RoleFirstNavigation = {
  items: [
    {
      guardrail: "Work from the ranked queue, then verify source records before customer contact.",
      nextSection: "#deal-desk",
      primarySection: "#today",
      role: "salesperson",
      staffCue: "Start with must-do-now customers"
    },
    {
      guardrail: "Review risk, blockers, stale work, and approvals without approving or discounting in this console.",
      nextSection: "#lead-operations",
      primarySection: "#command-center",
      role: "sales-manager",
      staffCue: "Start with team risk"
    },
    {
      guardrail: "Check assignment, SLA, duplicate review, and appointment context before updating the CRM source.",
      nextSection: "#today",
      primarySection: "#lead-operations",
      role: "bdc-lead-coordinator",
      staffCue: "Start with lead leakage"
    },
    {
      guardrail: "Use operating views first, then review admin/planning evidence only when needed.",
      nextSection: "#command-center",
      primarySection: "#command-center",
      role: "admin-owner",
      staffCue: "Start with operating health"
    }
  ] as const satisfies readonly SalesConsoleM15RoleNavigationItem[],
  readOnly: true
} as const;

export function salesConsoleM15RoleNavigationCoversCoreRoles() {
  return salesConsoleM15RoleFirstNavigation.items.length === 4;
}

export function salesConsoleM15RoleNavigationUsesInternalSections() {
  return salesConsoleM15RoleFirstNavigation.items.every((item) =>
    item.primarySection.startsWith("#") && item.nextSection.startsWith("#")
  );
}

export function salesConsoleM15RoleNavigationRemainsReadOnly() {
  return salesConsoleM15RoleFirstNavigation.readOnly &&
    salesConsoleM15RoleFirstNavigation.items.every((item) => item.guardrail.includes("verify") || item.guardrail.includes("without") || item.guardrail.includes("review"));
}
