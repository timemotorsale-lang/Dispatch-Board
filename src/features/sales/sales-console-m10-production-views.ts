import { type SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleProductionSurface =
  | "Admin Review"
  | "Deal Desk"
  | "Finance Handoff"
  | "Inventory"
  | "Leads"
  | "Manager Command Center"
  | "Today";

export type SalesConsoleAdminReviewPanel =
  | "AI Foundation"
  | "Approval Foundation"
  | "Audit Foundation"
  | "Coaching Foundation"
  | "CRM/DMS Contracts"
  | "Deal Workflow Foundation"
  | "Finance Foundation"
  | "Forecasting Foundation"
  | "Messaging Foundation"
  | "Multi-Store Reporting Foundation"
  | "Permissions Foundation"
  | "Production Readiness"
  | "Quote Foundation"
  | "Vehicle Holds Foundation";

export type SalesConsoleRoleProductionView = {
  adminPanelsVisible: SalesConsoleAdminReviewPanel[];
  emptyState: string;
  label: string;
  primarySurface: SalesConsoleProductionSurface;
  restrictedAdminPanels: SalesConsoleAdminReviewPanel[];
  restrictedSurfaces: SalesConsoleProductionSurface[];
  role: SalesConsoleEnterpriseRole;
  visibleSurfaces: SalesConsoleProductionSurface[];
};

const adminReviewPanels = [
  "Production Readiness",
  "Audit Foundation",
  "Permissions Foundation",
  "CRM/DMS Contracts",
  "Deal Workflow Foundation",
  "Approval Foundation",
  "Quote Foundation",
  "Finance Foundation",
  "Messaging Foundation",
  "Vehicle Holds Foundation",
  "Forecasting Foundation",
  "AI Foundation",
  "Coaching Foundation",
  "Multi-Store Reporting Foundation"
] as const satisfies SalesConsoleAdminReviewPanel[];

const allProductionSurfaces = [
  "Today",
  "Leads",
  "Deal Desk",
  "Inventory",
  "Manager Command Center",
  "Finance Handoff",
  "Admin Review"
] as const satisfies SalesConsoleProductionSurface[];

export const salesConsoleRoleProductionViews = [
  {
    adminPanelsVisible: [],
    emptyState: "No priority selling work is available. Verify assigned CRM tasks before assuming the queue is clear.",
    label: "Salesperson",
    primarySurface: "Today",
    restrictedAdminPanels: [...adminReviewPanels],
    restrictedSurfaces: ["Manager Command Center", "Finance Handoff", "Admin Review"],
    role: "salesperson",
    visibleSurfaces: ["Today", "Deal Desk", "Inventory"]
  },
  {
    adminPanelsVisible: [],
    emptyState: "No team risks are visible. Check source freshness before closing the manager command center.",
    label: "Sales Manager",
    primarySurface: "Manager Command Center",
    restrictedAdminPanels: [...adminReviewPanels],
    restrictedSurfaces: ["Admin Review", "Finance Handoff"],
    role: "sales-manager",
    visibleSurfaces: ["Today", "Leads", "Deal Desk", "Inventory", "Manager Command Center"]
  },
  {
    adminPanelsVisible: [],
    emptyState: "No lead operations work is visible. Verify lead-source sync and assignment queues.",
    label: "BDC / Lead Coordinator",
    primarySurface: "Leads",
    restrictedAdminPanels: [...adminReviewPanels],
    restrictedSurfaces: ["Deal Desk", "Manager Command Center", "Finance Handoff", "Admin Review"],
    role: "bdc-lead-coordinator",
    visibleSurfaces: ["Today", "Leads"]
  },
  {
    adminPanelsVisible: [...adminReviewPanels],
    emptyState: "No admin review blockers are visible. Enterprise foundations remain available for readiness review.",
    label: "Admin / Owner",
    primarySurface: "Admin Review",
    restrictedAdminPanels: [],
    restrictedSurfaces: [],
    role: "admin-owner",
    visibleSurfaces: [...allProductionSurfaces]
  },
  {
    adminPanelsVisible: ["Finance Foundation", "Audit Foundation", "Permissions Foundation"],
    emptyState: "No finance handoff packages are visible. Finance decisions stay outside the Sales Console.",
    label: "Finance",
    primarySurface: "Finance Handoff",
    restrictedAdminPanels: adminReviewPanels.filter((panel) => !["Finance Foundation", "Audit Foundation", "Permissions Foundation"].includes(panel)),
    restrictedSurfaces: ["Today", "Leads", "Inventory", "Admin Review"],
    role: "finance",
    visibleSurfaces: ["Deal Desk", "Finance Handoff"]
  }
] as const satisfies SalesConsoleRoleProductionView[];

export function getSalesConsoleProductionView(role: SalesConsoleEnterpriseRole) {
  return salesConsoleRoleProductionViews.find((view) => view.role === role);
}

export function adminPanelsAreRestrictedForOperatingRoles(views = salesConsoleRoleProductionViews) {
  return views
    .filter((view) => view.role !== "admin-owner")
    .every((view) => view.adminPanelsVisible.length === 0 || view.role === "finance");
}

export function eachRoleHasProductionEmptyState(views = salesConsoleRoleProductionViews) {
  return views.every((view) => view.emptyState.length > 20);
}

export function ordinaryRolesDoNotSeeAdminReviewSurface(views = salesConsoleRoleProductionViews) {
  return views
    .filter((view) => view.role !== "admin-owner")
    .every((view) => !(view.visibleSurfaces as readonly SalesConsoleProductionSurface[]).includes("Admin Review"));
}
