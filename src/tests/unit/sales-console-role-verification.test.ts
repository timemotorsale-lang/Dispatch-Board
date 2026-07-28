import { describe, expect, it } from "vitest";

import {
  salesConsoleM11EachRoleAvoidsUnauthorizedAdminPanels,
  salesConsoleM11EveryRequiredRoleHasFeatureAccess,
  salesConsoleM11ExcludedActionsRemainDisabled,
  salesConsoleM11PreDogfoodRoleVerificationPasses,
  salesConsoleM11ProductionViewsStillRestrictAdminReview,
  salesConsoleM11RoleVerificationSummary,
  salesConsoleM11SourceSystemsRemainReadOnly,
  salesConsoleM11UnknownAuthFixtureIsRestricted
} from "@/features/sales/sales-console-m11-role-verification";

describe("Sales Console M11 final role verification", () => {
  it("proves each required role has read-only feature access", () => {
    expect(salesConsoleM11EveryRequiredRoleHasFeatureAccess()).toBe(true);
  });

  it("keeps unauthorized roles away from admin panels", () => {
    expect(salesConsoleM11EachRoleAvoidsUnauthorizedAdminPanels()).toBe(true);
    expect(salesConsoleM11ProductionViewsStillRestrictAdminReview()).toBe(true);
  });

  it("keeps source systems read-only and authoritative", () => {
    expect(salesConsoleM11SourceSystemsRemainReadOnly()).toBe(true);
  });

  it("keeps all excluded actions disabled", () => {
    expect(salesConsoleM11ExcludedActionsRemainDisabled()).toBe(true);
  });

  it("keeps unknown auth fixtures restricted", () => {
    expect(salesConsoleM11UnknownAuthFixtureIsRestricted()).toBe(true);
  });

  it("passes the pre-dogfood role verification gate", () => {
    expect(salesConsoleM11PreDogfoodRoleVerificationPasses()).toBe(true);
    expect(salesConsoleM11RoleVerificationSummary.dogfoodReadinessEstimate).toBeGreaterThanOrEqual(85);
  });
});
