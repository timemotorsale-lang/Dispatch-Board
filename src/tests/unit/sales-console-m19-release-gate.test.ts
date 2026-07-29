import { describe, expect, it } from "vitest";

import {
  salesConsoleM19ReleaseGate,
  salesConsoleM19ReleaseGateActivatesOnlyManagerReview,
  salesConsoleM19ReleaseGateKeepsRiskyActionsBlocked,
  salesConsoleM19ReleaseGateRecommendsM20
} from "@/features/sales/sales-console-m19-release-gate";

describe("Sales Console M19 release gate", () => {
  it("activates only Manager Review Request", () => {
    expect(salesConsoleM19ReleaseGateActivatesOnlyManagerReview()).toBe(true);
    expect(salesConsoleM19ReleaseGate.activatedWorkflow).toContain("one audited task");
  });

  it("keeps risky workflows blocked", () => {
    expect(salesConsoleM19ReleaseGateKeepsRiskyActionsBlocked()).toBe(true);
    expect(salesConsoleM19ReleaseGate.stillBlocked).toContain("No finance decision");
  });

  it("recommends Milestone 20 next", () => {
    expect(salesConsoleM19ReleaseGateRecommendsM20()).toBe(true);
    expect(salesConsoleM19ReleaseGate.nextRecommendedMilestone).toContain("Manager Review workbench");
  });
});
