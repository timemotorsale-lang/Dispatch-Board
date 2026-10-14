import { describe, expect, it } from "vitest";

import {
  salesConsoleM18ReleaseGate,
  salesConsoleM18ReleaseGateBlocksRiskyActions,
  salesConsoleM18ReleaseGateHasBackendFoundation,
  salesConsoleM18ReleaseGateRecommendsM19
} from "@/features/sales/sales-console-m18-release-gate";

describe("Sales Console M18 release gate", () => {
  it("confirms the backend foundation is ready for review", () => {
    expect(salesConsoleM18ReleaseGateHasBackendFoundation()).toBe(true);
    expect(salesConsoleM18ReleaseGate.recommendation).toContain("Safe to review");
  });

  it("keeps risky actions blocked before activation", () => {
    expect(salesConsoleM18ReleaseGateBlocksRiskyActions()).toBe(true);
    expect(salesConsoleM18ReleaseGate.blockedBeforeActivation).toContain("No live manager-review task persistence");
  });

  it("names the next milestone before live persistence", () => {
    expect(salesConsoleM18ReleaseGateRecommendsM19()).toBe(true);
    expect(salesConsoleM18ReleaseGate.nextRecommendedMilestone).toContain("Audited Manager Review persistence");
  });
});
