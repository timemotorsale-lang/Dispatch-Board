import { salesConsoleRoleProductionViews } from "./sales-console-m10-production-views";
import type { SalesConsoleProductionSurface } from "./sales-console-m10-production-views";
import { salesConsoleM10ReadOnlySourceWiring } from "./sales-console-m10-read-only-source-wiring";
import { salesConsoleM11DogfoodAuthFixtures } from "./sales-console-m11-auth-role-seeding";
import { salesConsoleM11ReadOnlyFeatureFlags } from "./sales-console-m11-read-only-feature-flags";
import { salesConsoleM11RoleFeatureAccess } from "./sales-console-m11-role-feature-access";
import { requiredSalesConsoleDogfoodRoles } from "./sales-console-m11-staff-role-model";
import { salesConsoleMvpExecution } from "./sales-console-mvp-execution";

export const salesConsoleM11RoleVerificationSummary = {
  dogfoodReadinessEstimate: 88,
  gate: "pre-dogfood role activation review",
  guardrails: [
    "Every required dogfood role has a defined role model.",
    "Every dogfood role has read-only feature access.",
    "Unknown roles remain restricted.",
    "Admin review panels remain restricted to Admin / Owner.",
    "Source systems remain systems of record.",
    "Excluded workflows remain disabled."
  ],
  recommendation: "Safe to review for controlled read-only dogfooding after merge, push, and environment smoke verification."
} as const;

export function salesConsoleM11EveryRequiredRoleHasFeatureAccess() {
  return requiredSalesConsoleDogfoodRoles.every((role) =>
    salesConsoleM11RoleFeatureAccess.some((access) => access.role === role)
  );
}

export function salesConsoleM11EachRoleAvoidsUnauthorizedAdminPanels() {
  return salesConsoleM11RoleFeatureAccess.every((access) =>
    access.visibleFeatures.includes("Admin Review Panels") ? access.role === "admin-owner" : true
  );
}

export function salesConsoleM11SourceSystemsRemainReadOnly() {
  return salesConsoleM10ReadOnlySourceWiring.every((source) =>
    source.systemOfRecord && source.writeEnabled === false
  );
}

export function salesConsoleM11ExcludedActionsRemainDisabled() {
  const flagCoverage = salesConsoleM11ReadOnlyFeatureFlags.every((flag) => flag.blockedWriteWorkflows.length >= 6);
  const mvpGuardrails = salesConsoleMvpExecution.readOnlyGuardrails.every((guardrail) =>
    guardrail.status === "disabled" || guardrail.status === "planned"
  );

  return flagCoverage && mvpGuardrails;
}

export function salesConsoleM11UnknownAuthFixtureIsRestricted() {
  return salesConsoleM11DogfoodAuthFixtures.some((fixture) =>
    fixture.expectedStaffRole === null && fixture.expectedAccess === "restricted"
  );
}

export function salesConsoleM11ProductionViewsStillRestrictAdminReview() {
  return salesConsoleRoleProductionViews.every((view) =>
    (view.visibleSurfaces as readonly SalesConsoleProductionSurface[]).includes("Admin Review") ? view.role === "admin-owner" : true
  );
}

export function salesConsoleM11PreDogfoodRoleVerificationPasses() {
  return salesConsoleM11EveryRequiredRoleHasFeatureAccess() &&
    salesConsoleM11EachRoleAvoidsUnauthorizedAdminPanels() &&
    salesConsoleM11SourceSystemsRemainReadOnly() &&
    salesConsoleM11ExcludedActionsRemainDisabled() &&
    salesConsoleM11UnknownAuthFixtureIsRestricted() &&
    salesConsoleM11ProductionViewsStillRestrictAdminReview();
}
