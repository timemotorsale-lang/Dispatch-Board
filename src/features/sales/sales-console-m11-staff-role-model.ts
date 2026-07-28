import type { SalesConsoleProductionSurface } from "./sales-console-m10-production-views";

export type SalesConsoleDogfoodStaffRole =
  | "admin-owner"
  | "bdc-lead-coordinator"
  | "finance-visibility"
  | "marketing-advertising-visibility"
  | "office-operations-visibility"
  | "sales-manager"
  | "salesperson";

export type SalesConsoleDogfoodRoleStatus = "active-dogfood" | "planned-limited";

export type SalesConsoleStaffRoleModel = {
  appRoleNames: readonly string[];
  defaultSurface: SalesConsoleProductionSurface;
  description: string;
  dogfoodStatus: SalesConsoleDogfoodRoleStatus;
  label: string;
  readOnlyBoundary: string;
  role: SalesConsoleDogfoodStaffRole;
  staffIntent: string;
};

export const salesConsoleM11StaffRoleModel = [
  {
    appRoleNames: ["Salesperson"],
    defaultSurface: "Today",
    description: "Frontline seller view for assigned queue, active deals, inventory match, and source links.",
    dogfoodStatus: "active-dogfood",
    label: "Salesperson",
    readOnlyBoundary: "Can review assigned selling work only; cannot send messages, submit quotes, reserve vehicles, or approve discounts.",
    role: "salesperson",
    staffIntent: "Help sellers know what to verify and work next without replacing CRM tasks."
  },
  {
    appRoleNames: ["Sales Manager"],
    defaultSurface: "Manager Command Center",
    description: "Team operating view for risk queues, stale data, deal desk visibility, and manager review placeholders.",
    dogfoodStatus: "active-dogfood",
    label: "Sales Manager",
    readOnlyBoundary: "Can review team risk and planned approvals only; cannot execute approvals, finance decisions, holds, or source writes.",
    role: "sales-manager",
    staffIntent: "Help managers spot team blockers while keeping decision workflows in source systems."
  },
  {
    appRoleNames: ["BDC", "Lead Coordinator", "Operations Coordinator", "Front Desk Operations Coordinator"],
    defaultSurface: "Leads",
    description: "Lead coordination view for SLA risk, assignment state, duplicate-review cues, and appointment context.",
    dogfoodStatus: "active-dogfood",
    label: "BDC / Lead Coordinator",
    readOnlyBoundary: "Can review lead operations only; cannot automate outbound messaging or change deal structure.",
    role: "bdc-lead-coordinator",
    staffIntent: "Help lead coordinators find follow-up risk without turning the console into the CRM."
  },
  {
    appRoleNames: ["General Manager", "Owner", "Admin"],
    defaultSurface: "Admin Review",
    description: "Owner/admin readiness view for all operating surfaces, release evidence, role mapping, and guardrail review.",
    dogfoodStatus: "active-dogfood",
    label: "Admin / Owner",
    readOnlyBoundary: "Can review all panels and readiness evidence; cannot activate risky writes without a later release gate.",
    role: "admin-owner",
    staffIntent: "Help ownership verify whether the console is safe enough for staff dogfooding."
  },
  {
    appRoleNames: ["Finance", "Finance Manager", "Collections Manager"],
    defaultSurface: "Finance Handoff",
    description: "Finance visibility role for handoff status and source-record review only.",
    dogfoodStatus: "planned-limited",
    label: "Finance Visibility",
    readOnlyBoundary: "Can review handoff context only; finance decisions and restricted finance fields stay outside the Sales Console.",
    role: "finance-visibility",
    staffIntent: "Help finance identify handoff context gaps without deciding deals in the console."
  },
  {
    appRoleNames: ["Marketing/Advertisement Manager", "Marketing", "Advertising"],
    defaultSurface: "Leads",
    description: "Marketing visibility role for attribution/source-context review when lead source mapping is ready.",
    dogfoodStatus: "planned-limited",
    label: "Marketing / Advertising Visibility",
    readOnlyBoundary: "Can review attribution readiness only; cannot launch campaigns or write back to advertising tools.",
    role: "marketing-advertising-visibility",
    staffIntent: "Help marketing verify lead-source clarity before attribution is trusted."
  },
  {
    appRoleNames: ["Office Manager", "Office Staff", "Operations Coordinator"],
    defaultSurface: "Today",
    description: "Office/operations visibility role for customer/source-record support and handoff context.",
    dogfoodStatus: "planned-limited",
    label: "Office / Operations Visibility",
    readOnlyBoundary: "Can review operational context only; cannot replace CRM, DMS, task, appointment, or finance workflows.",
    role: "office-operations-visibility",
    staffIntent: "Help office staff support sales context without creating duplicate source-system work."
  }
] as const satisfies readonly SalesConsoleStaffRoleModel[];

export const requiredSalesConsoleDogfoodRoles = [
  "salesperson",
  "sales-manager",
  "bdc-lead-coordinator",
  "admin-owner",
  "finance-visibility",
  "marketing-advertising-visibility",
  "office-operations-visibility"
] as const satisfies readonly SalesConsoleDogfoodStaffRole[];

export function salesConsoleM11RoleModelIncludesRequiredStaffRoles() {
  return requiredSalesConsoleDogfoodRoles.every((role) =>
    salesConsoleM11StaffRoleModel.some((model) => model.role === role)
  );
}

export function salesConsoleM11RoleModelRemainsReadOnly() {
  return salesConsoleM11StaffRoleModel.every((model) =>
    model.readOnlyBoundary.includes("cannot") || model.readOnlyBoundary.includes("outside the Sales Console")
  );
}

export function salesConsoleM11ActiveDogfoodRolesAreLimited() {
  return salesConsoleM11StaffRoleModel
    .filter((model) => model.dogfoodStatus === "active-dogfood")
    .every((model) => ["salesperson", "sales-manager", "bdc-lead-coordinator", "admin-owner"].includes(model.role));
}

export function salesConsoleM11PlannedRolesDoNotCreateAdminAccess() {
  return salesConsoleM11StaffRoleModel
    .filter((model) => model.dogfoodStatus === "planned-limited")
    .every((model) => (model.defaultSurface as SalesConsoleProductionSurface) !== "Admin Review");
}
