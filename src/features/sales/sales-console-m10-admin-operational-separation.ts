import {
  salesConsoleRoleProductionViews,
  type SalesConsoleAdminReviewPanel,
  type SalesConsoleProductionSurface
} from "./sales-console-m10-production-views";
import type { SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleM10SurfaceMode = "admin-review" | "operational";

export type SalesConsoleM10SurfaceSeparationRule = {
  allowedRoles: readonly SalesConsoleEnterpriseRole[];
  mode: SalesConsoleM10SurfaceMode;
  panel?: SalesConsoleAdminReviewPanel;
  reason: string;
  surface: SalesConsoleProductionSurface;
};

export const salesConsoleM10OperationalSurfaces = [
  {
    allowedRoles: ["salesperson", "sales-manager", "bdc-lead-coordinator", "admin-owner"],
    mode: "operational",
    reason: "Daily priority queue, lead follow-up, and safe next-action visibility.",
    surface: "Today"
  },
  {
    allowedRoles: ["sales-manager", "bdc-lead-coordinator", "admin-owner"],
    mode: "operational",
    reason: "Lead operations coordination and SLA review; no messaging automation.",
    surface: "Leads"
  },
  {
    allowedRoles: ["salesperson", "sales-manager", "finance", "admin-owner"],
    mode: "operational",
    reason: "Visibility-only deal review; quote submission and approvals remain disabled.",
    surface: "Deal Desk"
  },
  {
    allowedRoles: ["salesperson", "sales-manager", "admin-owner"],
    mode: "operational",
    reason: "Vehicle matching and blocker visibility; holds and reservations remain disabled.",
    surface: "Inventory"
  },
  {
    allowedRoles: ["sales-manager", "admin-owner"],
    mode: "operational",
    reason: "Manager risk review and queue health; decision workflows stay disabled.",
    surface: "Manager Command Center"
  },
  {
    allowedRoles: ["finance", "admin-owner"],
    mode: "operational",
    reason: "Finance handoff visibility only; no finance decisions in Sales Console.",
    surface: "Finance Handoff"
  }
] as const satisfies readonly SalesConsoleM10SurfaceSeparationRule[];

export const salesConsoleM10AdminReviewSurfaces = [
  {
    allowedRoles: ["admin-owner"],
    mode: "admin-review",
    panel: "Production Readiness",
    reason: "Production checks, limitations, and pilot evidence are review-only.",
    surface: "Admin Review"
  },
  {
    allowedRoles: ["admin-owner"],
    mode: "admin-review",
    panel: "Audit Foundation",
    reason: "Audit coverage validates future enterprise actions before activation.",
    surface: "Admin Review"
  },
  {
    allowedRoles: ["admin-owner"],
    mode: "admin-review",
    panel: "Permissions Foundation",
    reason: "Permission gates remain deny-by-default and require admin review.",
    surface: "Admin Review"
  },
  {
    allowedRoles: ["admin-owner"],
    mode: "admin-review",
    panel: "CRM/DMS Contracts",
    reason: "Source contracts are readiness evidence, not replacement workflows.",
    surface: "Admin Review"
  },
  {
    allowedRoles: ["admin-owner"],
    mode: "admin-review",
    panel: "Messaging Foundation",
    reason: "Messaging send/automation foundations stay disabled and admin-reviewed.",
    surface: "Admin Review"
  },
  {
    allowedRoles: ["admin-owner"],
    mode: "admin-review",
    panel: "Vehicle Holds Foundation",
    reason: "Hold/reservation foundations stay disabled until separate approval.",
    surface: "Admin Review"
  }
] as const satisfies readonly SalesConsoleM10SurfaceSeparationRule[];

export const salesConsoleM10AdminOperationalSeparation = {
  adminReviewSurfaces: salesConsoleM10AdminReviewSurfaces,
  boundary: "Production operators see clean daily selling views; Admin / Owner keeps enterprise review panels for readiness evidence.",
  guardrails: [
    "Admin review panels are not daily operating surfaces.",
    "Finance can see finance handoff visibility only, not finance decisions.",
    "Salesperson, Sales Manager, and BDC roles do not see Admin Review.",
    "Prototype/planning language remains review-only and should not crowd daily production work."
  ],
  operationalSurfaces: salesConsoleM10OperationalSurfaces
} as const;

export function m10OperatingRolesDoNotSeeAdminReview() {
  return salesConsoleRoleProductionViews
    .filter((view) => view.role !== "admin-owner")
    .every((view) => !(view.visibleSurfaces as readonly SalesConsoleProductionSurface[]).includes("Admin Review"));
}

export function m10AdminReviewPanelsRequireAdminOwner() {
  return salesConsoleM10AdminReviewSurfaces.every((surface) =>
    surface.allowedRoles.length === 1 && surface.allowedRoles[0] === "admin-owner"
  );
}

export function m10OperationalSurfacesHaveRoleOwners() {
  return salesConsoleM10OperationalSurfaces.every((surface) =>
    surface.allowedRoles.length > 0 && surface.reason.length > 20
  );
}

export function m10FinanceIsOperationalVisibilityOnly() {
  const financeSurface = salesConsoleM10OperationalSurfaces.find((surface) => surface.surface === "Finance Handoff");

  return Boolean(
    financeSurface &&
    financeSurface.allowedRoles.includes("finance") &&
    financeSurface.reason.includes("no finance decisions")
  );
}
