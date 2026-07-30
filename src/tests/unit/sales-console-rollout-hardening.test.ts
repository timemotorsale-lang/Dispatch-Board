import { describe, expect, it } from "vitest";

import {
  salesConsoleRolloutHardeningChecks,
  salesConsoleRolloutHardeningPassCount,
  salesConsoleRolloutHardeningReadyForGate,
  salesConsoleRolloutHasNoDeadActions
} from "@/features/sales/sales-console-rollout-hardening";

describe("Sales Console rollout hardening", () => {
  it("checks roles, source state, dead actions, accessibility, and performance", () => {
    expect(salesConsoleRolloutHardeningChecks.map((check) => check.id)).toEqual(
      expect.arrayContaining(["roles", "source-freshness", "empty-error", "no-dead-actions", "accessibility", "performance"])
    );
  });

  it("passes the no-dead-action audit", () => {
    expect(salesConsoleRolloutHasNoDeadActions()).toBe(true);
  });

  it("is ready for rollout gate except production build confirmation", () => {
    expect(salesConsoleRolloutHardeningPassCount()).toBeGreaterThanOrEqual(5);
    expect(salesConsoleRolloutHardeningReadyForGate()).toBe(true);
  });
});
