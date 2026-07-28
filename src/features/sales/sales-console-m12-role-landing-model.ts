import type { SalesConsoleDogfoodFeature } from "./sales-console-m11-role-feature-access";
import type { SalesConsoleDogfoodStaffRole } from "./sales-console-m11-staff-role-model";

export type SalesConsoleRoleLandingRouteMode = "inside-sales-console";

export type SalesConsoleRoleLandingExperience = {
  defaultFeature: SalesConsoleDogfoodFeature;
  defaultSectionId: string;
  landingCopy: string;
  mode: SalesConsoleRoleLandingRouteMode;
  role: SalesConsoleDogfoodStaffRole;
  startHereLabel: string;
};

export const salesConsoleM12RoleLandingExperiences = [
  {
    defaultFeature: "Salesperson Today",
    defaultSectionId: "today",
    landingCopy: "Start with the highest-priority selling work, then verify details in CRM/source records before acting.",
    mode: "inside-sales-console",
    role: "salesperson",
    startHereLabel: "Start with Today"
  },
  {
    defaultFeature: "Manager Command Center",
    defaultSectionId: "command-center",
    landingCopy: "Start with team risk, stale records, and blocked deals before coaching or requesting source verification.",
    mode: "inside-sales-console",
    role: "sales-manager",
    startHereLabel: "Start with Team Risk"
  },
  {
    defaultFeature: "Lead Operations",
    defaultSectionId: "lead-operations",
    landingCopy: "Start with lead SLA risk, assignment state, duplicate review, and appointment context.",
    mode: "inside-sales-console",
    role: "bdc-lead-coordinator",
    startHereLabel: "Start with Lead Ops"
  },
  {
    defaultFeature: "Admin Review Panels",
    defaultSectionId: "command-center",
    landingCopy: "Start with readiness evidence, role activation, guardrails, and dogfood approval status.",
    mode: "inside-sales-console",
    role: "admin-owner",
    startHereLabel: "Start with Admin Review"
  },
  {
    defaultFeature: "Finance Handoff Visibility",
    defaultSectionId: "deal-desk",
    landingCopy: "Start with handoff visibility only. Finance decisions remain outside the Sales Console.",
    mode: "inside-sales-console",
    role: "finance-visibility",
    startHereLabel: "Start with Handoff Context"
  },
  {
    defaultFeature: "Lead Operations",
    defaultSectionId: "lead-operations",
    landingCopy: "Start with source attribution readiness and verify campaign/source labels before trusting them.",
    mode: "inside-sales-console",
    role: "marketing-advertising-visibility",
    startHereLabel: "Start with Attribution Readiness"
  },
  {
    defaultFeature: "Source Links",
    defaultSectionId: "today",
    landingCopy: "Start with customer/source support context and verify source records before routing staff questions.",
    mode: "inside-sales-console",
    role: "office-operations-visibility",
    startHereLabel: "Start with Source Support"
  }
] as const satisfies readonly SalesConsoleRoleLandingExperience[];

export function salesConsoleM12RoleLandingsStayInsideSales() {
  return salesConsoleM12RoleLandingExperiences.every((landing) => landing.mode === "inside-sales-console");
}

export function salesConsoleM12EveryRoleHasLandingExperience() {
  const requiredRoles = [
    "salesperson",
    "sales-manager",
    "bdc-lead-coordinator",
    "admin-owner",
    "finance-visibility",
    "marketing-advertising-visibility",
    "office-operations-visibility"
  ] as const satisfies readonly SalesConsoleDogfoodStaffRole[];

  return requiredRoles.every((role) =>
    salesConsoleM12RoleLandingExperiences.some((landing) => landing.role === role)
  );
}

export function salesConsoleM12RoleLandingsHaveStartGuidance() {
  return salesConsoleM12RoleLandingExperiences.every((landing) =>
    landing.startHereLabel.length > 8 && landing.landingCopy.length > 40 && landing.defaultSectionId.length > 0
  );
}
