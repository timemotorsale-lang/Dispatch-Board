import { salesConsoleM12RoleLandingExperiences } from "./sales-console-m12-role-landing-model";
import type { SalesConsoleDogfoodStaffRole } from "./sales-console-m11-staff-role-model";

export type SalesConsoleRoleStartCard = {
  caution: string;
  href: string;
  primaryCheck: string;
  role: SalesConsoleDogfoodStaffRole;
  title: string;
};

export const salesConsoleM12RoleStartCards = salesConsoleM12RoleLandingExperiences.map((landing) => ({
  caution: "Read-only dogfood: verify source records before action.",
  href: `#${landing.defaultSectionId}`,
  primaryCheck: landing.landingCopy,
  role: landing.role,
  title: landing.startHereLabel
})) as readonly SalesConsoleRoleStartCard[];

export function salesConsoleM12StartCardsCoverEveryLanding() {
  return salesConsoleM12RoleLandingExperiences.every((landing) =>
    salesConsoleM12RoleStartCards.some((card) => card.role === landing.role && card.href === `#${landing.defaultSectionId}`)
  );
}

export function salesConsoleM12StartCardsRemainReadOnly() {
  return salesConsoleM12RoleStartCards.every((card) =>
    card.caution.includes("Read-only") && card.caution.includes("verify source records")
  );
}

export function getSalesConsoleM12StartCard(role: SalesConsoleDogfoodStaffRole) {
  return salesConsoleM12RoleStartCards.find((card) => card.role === role);
}
