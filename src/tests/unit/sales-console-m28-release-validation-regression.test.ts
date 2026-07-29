import { describe, expect, it } from "vitest";

import {
  salesConsoleM28CoversCriticalRegressionAreas,
  salesConsoleM28DefinesReleaseGoNoGo,
  salesConsoleM28FlagsProtectedRouteAsEnvironmentSmoke,
  salesConsoleM28KeepsOnlyManagerReviewSubmitLive,
  salesConsoleM28ReleaseValidationRegression
} from "@/features/sales/sales-console-m28-release-validation-regression";

describe("Sales Console M28 release validation regression", () => {
  it("covers every critical MVP release regression area", () => {
    expect(salesConsoleM28CoversCriticalRegressionAreas()).toBe(true);
    expect(salesConsoleM28ReleaseValidationRegression.checks).toHaveLength(8);
  });

  it("keeps Manager Review Request as the only active submit workflow", () => {
    expect(salesConsoleM28KeepsOnlyManagerReviewSubmitLive()).toBe(true);
  });

  it("defines go and no-go deployment gates", () => {
    expect(salesConsoleM28DefinesReleaseGoNoGo()).toBe(true);
    expect(salesConsoleM28ReleaseValidationRegression.goNoGo.noGo).toContain("Any broad write workflow appears outside Manager Review Request.");
  });

  it("marks protected route behavior for target environment smoke verification", () => {
    expect(salesConsoleM28FlagsProtectedRouteAsEnvironmentSmoke()).toBe(true);
  });
});
