import { describe, expect, it } from "vitest";

import {
  salesConsoleM24HasRollbackSupportAndMonitoring,
  salesConsoleM24KeepsOnlyManagerReviewLive,
  salesConsoleM24OfficialReleaseGate,
  salesConsoleM24ReleaseIsConditional
} from "@/features/sales/sales-console-m24-official-release-gate";

describe("Sales Console M24 official release gate", () => {
  it("keeps official release conditional", () => {
    expect(salesConsoleM24ReleaseIsConditional()).toBe(true);
  });

  it("keeps only Manager Review Request live", () => {
    expect(salesConsoleM24KeepsOnlyManagerReviewLive()).toBe(true);
    expect(salesConsoleM24OfficialReleaseGate.knownLimitations.join(" ")).toContain("Quote");
  });

  it("defines rollback support and monitoring", () => {
    expect(salesConsoleM24HasRollbackSupportAndMonitoring()).toBe(true);
  });
});
