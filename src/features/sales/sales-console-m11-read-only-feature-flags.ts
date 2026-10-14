import type { SalesConsoleDogfoodStaffRole } from "./sales-console-m11-staff-role-model";

export type SalesConsoleDogfoodFeatureFlagStatus = "disabled-planned" | "enabled-read-only";

export type SalesConsoleDogfoodFeatureFlag = {
  blockedWriteWorkflows: readonly string[];
  defaultSafeState: "deny-by-default";
  flag: string;
  ownerApprovalRequiredForWrites: true;
  role: SalesConsoleDogfoodStaffRole;
  status: SalesConsoleDogfoodFeatureFlagStatus;
  visibilityOnly: true;
};

export const salesConsoleM11BlockedWriteWorkflows = [
  "customer messaging automation",
  "quote submission",
  "vehicle holds/reservations",
  "finance decisions",
  "discount approvals",
  "CRM/DMS/source-system writes"
] as const;

export const salesConsoleM11ReadOnlyFeatureFlags = [
  {
    blockedWriteWorkflows: salesConsoleM11BlockedWriteWorkflows,
    defaultSafeState: "deny-by-default",
    flag: "sales-console.dogfood.salesperson-view",
    ownerApprovalRequiredForWrites: true,
    role: "salesperson",
    status: "enabled-read-only",
    visibilityOnly: true
  },
  {
    blockedWriteWorkflows: salesConsoleM11BlockedWriteWorkflows,
    defaultSafeState: "deny-by-default",
    flag: "sales-console.dogfood.sales-manager-view",
    ownerApprovalRequiredForWrites: true,
    role: "sales-manager",
    status: "enabled-read-only",
    visibilityOnly: true
  },
  {
    blockedWriteWorkflows: salesConsoleM11BlockedWriteWorkflows,
    defaultSafeState: "deny-by-default",
    flag: "sales-console.dogfood.bdc-lead-coordinator-view",
    ownerApprovalRequiredForWrites: true,
    role: "bdc-lead-coordinator",
    status: "enabled-read-only",
    visibilityOnly: true
  },
  {
    blockedWriteWorkflows: salesConsoleM11BlockedWriteWorkflows,
    defaultSafeState: "deny-by-default",
    flag: "sales-console.dogfood.admin-owner-review-view",
    ownerApprovalRequiredForWrites: true,
    role: "admin-owner",
    status: "enabled-read-only",
    visibilityOnly: true
  },
  {
    blockedWriteWorkflows: salesConsoleM11BlockedWriteWorkflows,
    defaultSafeState: "deny-by-default",
    flag: "sales-console.dogfood.finance-visibility-view",
    ownerApprovalRequiredForWrites: true,
    role: "finance-visibility",
    status: "disabled-planned",
    visibilityOnly: true
  },
  {
    blockedWriteWorkflows: salesConsoleM11BlockedWriteWorkflows,
    defaultSafeState: "deny-by-default",
    flag: "sales-console.dogfood.marketing-advertising-visibility-view",
    ownerApprovalRequiredForWrites: true,
    role: "marketing-advertising-visibility",
    status: "disabled-planned",
    visibilityOnly: true
  },
  {
    blockedWriteWorkflows: salesConsoleM11BlockedWriteWorkflows,
    defaultSafeState: "deny-by-default",
    flag: "sales-console.dogfood.office-operations-visibility-view",
    ownerApprovalRequiredForWrites: true,
    role: "office-operations-visibility",
    status: "disabled-planned",
    visibilityOnly: true
  }
] as const satisfies readonly SalesConsoleDogfoodFeatureFlag[];

export function salesConsoleM11FeatureFlagsAreVisibilityOnly() {
  return salesConsoleM11ReadOnlyFeatureFlags.every((flag) =>
    flag.visibilityOnly && flag.defaultSafeState === "deny-by-default"
  );
}

export function salesConsoleM11FeatureFlagsNeverEnableExcludedActions() {
  return salesConsoleM11ReadOnlyFeatureFlags.every((flag) =>
    salesConsoleM11BlockedWriteWorkflows.every((workflow) => flag.blockedWriteWorkflows.includes(workflow)) &&
    flag.ownerApprovalRequiredForWrites
  );
}

export function salesConsoleM11CoreDogfoodFlagsEnabledReadOnly() {
  return salesConsoleM11ReadOnlyFeatureFlags
    .filter((flag) => ["salesperson", "sales-manager", "bdc-lead-coordinator", "admin-owner"].includes(flag.role))
    .every((flag) => flag.status === "enabled-read-only" && flag.visibilityOnly);
}

export function salesConsoleM11OptionalFlagsRemainPlannedDisabled() {
  return salesConsoleM11ReadOnlyFeatureFlags
    .filter((flag) => ["finance-visibility", "marketing-advertising-visibility", "office-operations-visibility"].includes(flag.role))
    .every((flag) => flag.status === "disabled-planned");
}
