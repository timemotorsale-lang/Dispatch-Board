import {
  salesConsoleM12RoleLandingExperiences,
  type SalesConsoleRoleLandingExperience
} from "./sales-console-m12-role-landing-model";
import type { SalesConsoleDogfoodStaffRole } from "./sales-console-m11-staff-role-model";

export type SalesConsoleRoleLandingHeader = {
  activeLanding: SalesConsoleRoleLandingExperience;
  eyebrow: string;
  headline: string;
  readOnlyReminder: string;
  sectionHref: string;
};

export function getSalesConsoleM12RoleLandingHeader(
  role: SalesConsoleDogfoodStaffRole = "sales-manager"
): SalesConsoleRoleLandingHeader {
  const activeLanding = salesConsoleM12RoleLandingExperiences.find((landing) => landing.role === role) ??
    salesConsoleM12RoleLandingExperiences.find((landing) => landing.role === "sales-manager") ??
    salesConsoleM12RoleLandingExperiences[0];

  return {
    activeLanding,
    eyebrow: "Role landing experience",
    headline: `${activeLanding.startHereLabel}: ${activeLanding.defaultFeature}`,
    readOnlyReminder: "This landing experience changes orientation only. It does not enable writes, submissions, approvals, holds, messaging, or source-system updates.",
    sectionHref: `#${activeLanding.defaultSectionId}`
  };
}

export const salesConsoleM12DefaultRoleLandingHeader = getSalesConsoleM12RoleLandingHeader();

export function salesConsoleM12LandingHeaderStaysReadOnly(
  header: SalesConsoleRoleLandingHeader = salesConsoleM12DefaultRoleLandingHeader
) {
  return header.readOnlyReminder.includes("does not enable writes") &&
    header.readOnlyReminder.includes("approvals") &&
    header.sectionHref.startsWith("#");
}

export function salesConsoleM12EveryLandingHeaderTargetsInternalSection() {
  return salesConsoleM12RoleLandingExperiences.every((landing) =>
    getSalesConsoleM12RoleLandingHeader(landing.role).sectionHref === `#${landing.defaultSectionId}`
  );
}
