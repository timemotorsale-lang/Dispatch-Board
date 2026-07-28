import { describe, expect, it } from "vitest";

import {
  m10AdminReviewPanelsRequireAdminOwner,
  m10FinanceIsOperationalVisibilityOnly,
  m10OperatingRolesDoNotSeeAdminReview,
  m10OperationalSurfacesHaveRoleOwners,
  salesConsoleM10AdminOperationalSeparation
} from "@/features/sales/sales-console-m10-admin-operational-separation";

describe("Sales Console M10 admin operational separation", () => {
  it("keeps operating roles away from Admin Review", () => {
    expect(m10OperatingRolesDoNotSeeAdminReview()).toBe(true);
  });

  it("requires Admin / Owner for admin review panels", () => {
    expect(m10AdminReviewPanelsRequireAdminOwner()).toBe(true);
    expect(
      salesConsoleM10AdminOperationalSeparation.adminReviewSurfaces.every((surface) =>
        surface.allowedRoles.length === 1 && surface.allowedRoles.includes("admin-owner")
      )
    ).toBe(true);
  });

  it("gives every operational surface role ownership and a reason", () => {
    expect(m10OperationalSurfacesHaveRoleOwners()).toBe(true);
    expect(salesConsoleM10AdminOperationalSeparation.operationalSurfaces).toHaveLength(6);
  });

  it("keeps finance handoff as visibility-only", () => {
    expect(m10FinanceIsOperationalVisibilityOnly()).toBe(true);
  });
});
