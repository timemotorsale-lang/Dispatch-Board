import { describe, expect, it } from "vitest";

import {
  salesConsoleM11CoreDogfoodRolesResolve,
  salesConsoleM11DogfoodFixturesAreNonDestructive,
  salesConsoleM11OptionalVisibilityRolesAreFixtureOnly,
  salesConsoleM11UnknownRolesRemainRestricted,
  salesConsoleM11DogfoodAuthFixtures
} from "@/features/sales/sales-console-m11-auth-role-seeding";

describe("Sales Console M11 auth role seeding evidence", () => {
  it("uses non-destructive fixture-only mapping evidence", () => {
    expect(salesConsoleM11DogfoodFixturesAreNonDestructive()).toBe(true);
  });

  it("resolves core dogfood roles through the existing auth access mapping", () => {
    expect(salesConsoleM11CoreDogfoodRolesResolve()).toBe(true);
  });

  it("keeps unknown roles restricted by default", () => {
    expect(salesConsoleM11UnknownRolesRemainRestricted()).toBe(true);
  });

  it("keeps optional visibility roles as fixture-only evidence", () => {
    expect(salesConsoleM11OptionalVisibilityRolesAreFixtureOnly()).toBe(true);
    expect(salesConsoleM11DogfoodAuthFixtures.some((fixture) => fixture.expectedStaffRole === "marketing-advertising-visibility")).toBe(true);
    expect(salesConsoleM11DogfoodAuthFixtures.some((fixture) => fixture.expectedStaffRole === "office-operations-visibility")).toBe(true);
  });
});
