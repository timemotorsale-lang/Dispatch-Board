import { describe, expect, it } from "vitest";

import {
  salesConsoleM12AdminDogfoodLandingSummary,
  salesConsoleM12AdminLandingSummaryPasses,
  salesConsoleM12SeparateRoutesRemainDeferred
} from "@/features/sales/sales-console-m12-admin-dogfood-landing-summary";

describe("Sales Console M12 admin dogfood landing summary", () => {
  it("passes the role landing readiness summary", () => {
    expect(salesConsoleM12AdminLandingSummaryPasses()).toBe(true);
    expect(salesConsoleM12AdminDogfoodLandingSummary.dogfoodReadinessEstimate).toBeGreaterThanOrEqual(90);
  });

  it("keeps separate role routes deferred", () => {
    expect(salesConsoleM12SeparateRoutesRemainDeferred()).toBe(true);
  });
});
