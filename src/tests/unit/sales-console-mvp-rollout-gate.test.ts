import { describe, expect, it } from "vitest";

import {
  salesConsoleMvpRolloutGateIsReadyForStaffPilot,
  salesConsoleMvpRolloutGateItems,
  salesConsoleMvpRolloutGateKnownBlockers,
  salesConsoleMvpRolloutGatePassCount
} from "@/features/sales/sales-console-mvp-rollout-gate";

describe("Sales Console MVP rollout gate", () => {
  it("combines real reads, source-backed UI, safe recording, cross-console links, and hardening", () => {
    expect(salesConsoleMvpRolloutGateItems.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "real-read-services",
        "source-backed-tabs",
        "safe-recording",
        "cross-console-links",
        "rollout-hardening",
        "production-build"
      ])
    );
  });

  it("is ready for staff pilot review while keeping production build blocker explicit", () => {
    expect(salesConsoleMvpRolloutGateIsReadyForStaffPilot()).toBe(true);
    expect(salesConsoleMvpRolloutGatePassCount()).toBe(5);
    expect(salesConsoleMvpRolloutGateKnownBlockers()).toEqual([
      expect.objectContaining({ id: "production-build", passed: false })
    ]);
  });
});
