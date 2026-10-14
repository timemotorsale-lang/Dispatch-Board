import { describe, expect, it } from "vitest";

import {
  salesConsoleM13DogfoodAudienceIsControlled,
  salesConsoleM13DogfoodReadiness,
  salesConsoleM13DogfoodReadinessKeepsWritesDisabled,
  salesConsoleM13DogfoodRequiresOwnerReview
} from "@/features/sales/sales-console-m13-dogfood-readiness";

describe("Sales Console M13 dogfood readiness", () => {
  it("requires owner review before dogfooding", () => {
    expect(salesConsoleM13DogfoodRequiresOwnerReview()).toBe(true);
  });

  it("keeps the dogfood audience controlled", () => {
    expect(salesConsoleM13DogfoodAudienceIsControlled()).toBe(true);
    expect(salesConsoleM13DogfoodReadiness.audience).toHaveLength(7);
  });

  it("keeps write workflows disabled", () => {
    expect(salesConsoleM13DogfoodReadinessKeepsWritesDisabled()).toBe(true);
  });
});
