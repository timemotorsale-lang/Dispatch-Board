import { describe, expect, it } from "vitest";

import {
  salesConsoleM11BlockedWriteWorkflows,
  salesConsoleM11CoreDogfoodFlagsEnabledReadOnly,
  salesConsoleM11FeatureFlagsAreVisibilityOnly,
  salesConsoleM11FeatureFlagsNeverEnableExcludedActions,
  salesConsoleM11OptionalFlagsRemainPlannedDisabled,
  salesConsoleM11ReadOnlyFeatureFlags
} from "@/features/sales/sales-console-m11-read-only-feature-flags";

describe("Sales Console M11 read-only feature flags", () => {
  it("defines visibility-only flags for dogfood roles", () => {
    expect(salesConsoleM11FeatureFlagsAreVisibilityOnly()).toBe(true);
    expect(salesConsoleM11ReadOnlyFeatureFlags).toHaveLength(7);
  });

  it("never enables excluded workflows", () => {
    expect(salesConsoleM11FeatureFlagsNeverEnableExcludedActions()).toBe(true);
    for (const flag of salesConsoleM11ReadOnlyFeatureFlags) {
      for (const workflow of salesConsoleM11BlockedWriteWorkflows) {
        expect(flag.blockedWriteWorkflows).toContain(workflow);
      }
    }
  });

  it("enables core dogfood flags as read-only", () => {
    expect(salesConsoleM11CoreDogfoodFlagsEnabledReadOnly()).toBe(true);
  });

  it("keeps optional visibility flags planned and disabled", () => {
    expect(salesConsoleM11OptionalFlagsRemainPlannedDisabled()).toBe(true);
  });
});
