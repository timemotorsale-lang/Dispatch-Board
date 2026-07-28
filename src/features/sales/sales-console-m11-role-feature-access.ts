import type { SalesConsoleDogfoodStaffRole } from "./sales-console-m11-staff-role-model";

export type SalesConsoleDogfoodFeature =
  | "Admin Review Panels"
  | "Deal Desk"
  | "Disabled Planned Actions"
  | "Finance Handoff Visibility"
  | "Inventory Intelligence"
  | "Lead Operations"
  | "Manager Command Center"
  | "Release/Readiness Panels"
  | "Salesperson Today"
  | "Source Links";

export type SalesConsoleRoleFeatureAccess = {
  disabledPlannedActions: readonly string[];
  emptyStateGuidance: string;
  hiddenFeatures: readonly SalesConsoleDogfoodFeature[];
  readOnly: true;
  role: SalesConsoleDogfoodStaffRole;
  visibleFeatures: readonly SalesConsoleDogfoodFeature[];
};

const allDogfoodFeatures = [
  "Salesperson Today",
  "Lead Operations",
  "Manager Command Center",
  "Deal Desk",
  "Inventory Intelligence",
  "Source Links",
  "Finance Handoff Visibility",
  "Admin Review Panels",
  "Release/Readiness Panels",
  "Disabled Planned Actions"
] as const satisfies readonly SalesConsoleDogfoodFeature[];

const excludedActions = [
  "Customer messaging automation",
  "Quote submission",
  "Vehicle holds/reservations",
  "Finance decisions",
  "Discount approvals",
  "CRM/DMS/source-system writes"
] as const;

function hiddenFeatures(visibleFeatures: readonly SalesConsoleDogfoodFeature[]) {
  return allDogfoodFeatures.filter((feature) => !visibleFeatures.includes(feature));
}

function access(
  role: SalesConsoleDogfoodStaffRole,
  visibleFeatures: readonly SalesConsoleDogfoodFeature[],
  emptyStateGuidance: string
): SalesConsoleRoleFeatureAccess {
  return {
    disabledPlannedActions: excludedActions,
    emptyStateGuidance,
    hiddenFeatures: hiddenFeatures(visibleFeatures),
    readOnly: true,
    role,
    visibleFeatures
  };
}

export const salesConsoleM11RoleFeatureAccess = [
  access("salesperson", ["Salesperson Today", "Deal Desk", "Inventory Intelligence", "Source Links", "Disabled Planned Actions"], "If no selling work is visible, verify CRM ownership and assigned task freshness before assuming the queue is clear."),
  access("sales-manager", ["Salesperson Today", "Lead Operations", "Manager Command Center", "Deal Desk", "Inventory Intelligence", "Source Links", "Disabled Planned Actions"], "If team risk is empty, verify team mapping and source freshness before ending manager review."),
  access("bdc-lead-coordinator", ["Salesperson Today", "Lead Operations", "Source Links", "Disabled Planned Actions"], "If lead operations is empty, verify lead-source sync, duplicate-review queues, and appointment mappings."),
  access("admin-owner", allDogfoodFeatures, "If admin review has no blockers, review release gates and source labels before approving staff dogfooding."),
  access("finance-visibility", ["Deal Desk", "Finance Handoff Visibility", "Source Links", "Disabled Planned Actions"], "If finance handoff is empty, verify source packages in the finance system; do not make finance decisions here."),
  access("marketing-advertising-visibility", ["Lead Operations", "Source Links", "Disabled Planned Actions"], "If attribution is unavailable, verify the lead source in CRM and advertising tools before trusting the label."),
  access("office-operations-visibility", ["Salesperson Today", "Source Links", "Disabled Planned Actions"], "If customer context is missing, verify CRM, task, appointment, and DMS source records.")
] as const satisfies readonly SalesConsoleRoleFeatureAccess[];

export function getSalesConsoleM11RoleFeatureAccess(role: SalesConsoleDogfoodStaffRole) {
  return salesConsoleM11RoleFeatureAccess.find((accessRule) => accessRule.role === role);
}

export function salesConsoleM11EveryRoleHasFeatureAccess() {
  return salesConsoleM11RoleFeatureAccess.every((accessRule) =>
    accessRule.visibleFeatures.length > 0 &&
    accessRule.hiddenFeatures.length >= 0 &&
    accessRule.emptyStateGuidance.length > 30
  );
}

export function salesConsoleM11FeatureAccessRemainsReadOnly() {
  return salesConsoleM11RoleFeatureAccess.every((accessRule) =>
    accessRule.readOnly &&
    excludedActions.every((action) => accessRule.disabledPlannedActions.includes(action))
  );
}

export function salesConsoleM11OnlyAdminOwnerSeesAdminReviewPanels() {
  return salesConsoleM11RoleFeatureAccess.every((accessRule) =>
    accessRule.visibleFeatures.includes("Admin Review Panels") ? accessRule.role === "admin-owner" : true
  );
}

export function salesConsoleM11FinanceVisibilityCannotDecideFinance() {
  const financeAccess = getSalesConsoleM11RoleFeatureAccess("finance-visibility");

  return Boolean(
    financeAccess?.visibleFeatures.includes("Finance Handoff Visibility") &&
    financeAccess.disabledPlannedActions.includes("Finance decisions")
  );
}
