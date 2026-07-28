import type { SalesConsoleDogfoodStaffRole } from "./sales-console-m11-staff-role-model";

export type SalesConsoleRoleEmptyPlannedState = {
  disabledExplanation: string;
  emptyState: string;
  plannedNext: string;
  role: SalesConsoleDogfoodStaffRole;
  verifyFirst: string;
};

export const salesConsoleM12RoleEmptyPlannedStates = [
  {
    disabledExplanation: "Messaging, quote submission, holds, finance decisions, and discount approvals are disabled for salesperson dogfooding.",
    emptyState: "No assigned selling work is visible. Verify CRM ownership, task assignment, and source freshness before assuming there is no work.",
    plannedNext: "Live filters, saved views, and source-linked customer drill-in are planned after dogfood feedback.",
    role: "salesperson",
    verifyFirst: "Verify CRM customer, task, deal, and inventory records before contacting customers."
  },
  {
    disabledExplanation: "Manager approvals are disabled request-contract only; no approval decision executes from the Sales Console.",
    emptyState: "No team risk is visible. Verify manager team scope, stale source labels, and blocked deal queues.",
    plannedNext: "Manager review queues and coaching insights will become richer after source mapping is trusted.",
    role: "sales-manager",
    verifyFirst: "Verify source records before coaching, reprioritizing, or escalating team work."
  },
  {
    disabledExplanation: "Outbound messaging automation and lead reassignment writes are disabled.",
    emptyState: "No lead operations work is visible. Verify lead sync, duplicate review, assignment state, and appointment mapping.",
    plannedNext: "Lead source drill-in and BDC-specific filters are planned after dogfood.",
    role: "bdc-lead-coordinator",
    verifyFirst: "Verify lead and appointment source records before treating the queue as clear."
  },
  {
    disabledExplanation: "Admin review can inspect readiness but cannot activate risky workflows without a future release gate.",
    emptyState: "No readiness blockers are visible. Review release evidence before approving dogfood expansion.",
    plannedNext: "Dogfood feedback controls and release gates should follow this role landing phase.",
    role: "admin-owner",
    verifyFirst: "Verify role mapping, source labels, and disabled action coverage before staff expansion."
  },
  {
    disabledExplanation: "Finance visibility is planned/disabled and never makes finance decisions inside Sales Console.",
    emptyState: "No finance handoff context is visible. Verify finance package status in the finance source system.",
    plannedNext: "Finance handoff visibility can be activated after role/privacy review.",
    role: "finance-visibility",
    verifyFirst: "Verify restricted finance fields remain outside the Sales Console."
  },
  {
    disabledExplanation: "Campaign launch, advertising edits, and attribution writes are disabled.",
    emptyState: "No attribution context is visible. Verify campaign/source labels in CRM and advertising systems.",
    plannedNext: "Marketing attribution readiness should wait for CRM, advertising, and marketing console boundaries.",
    role: "marketing-advertising-visibility",
    verifyFirst: "Verify lead-source labels before trusting marketing attribution."
  },
  {
    disabledExplanation: "Office/operations visibility cannot replace CRM, DMS, task, appointment, or finance workflows.",
    emptyState: "No customer/source support context is visible. Verify CRM, DMS, task, and appointment records.",
    plannedNext: "Office support views can expand after customer/CRM console boundaries are clearer.",
    role: "office-operations-visibility",
    verifyFirst: "Verify source records before routing staff questions or customer context."
  }
] as const satisfies readonly SalesConsoleRoleEmptyPlannedState[];

export function salesConsoleM12EveryRoleHasEmptyAndPlannedState() {
  return salesConsoleM12RoleEmptyPlannedStates.every((state) =>
    state.emptyState.length > 40 &&
    state.disabledExplanation.length > 40 &&
    state.plannedNext.length > 30 &&
    state.verifyFirst.length > 30
  );
}

export function salesConsoleM12PlannedStatesKeepRiskyActionsDisabled() {
  const riskyTerms = ["disabled", "cannot", "never"];

  return salesConsoleM12RoleEmptyPlannedStates.every((state) =>
    riskyTerms.some((term) => state.disabledExplanation.toLowerCase().includes(term))
  );
}
