import { describe, expect, it } from "vitest";

import {
  coachingHasNoHiddenScoringOrPunitiveAutomation,
  coachingInsightsAreExplainable,
  coachingVisibilityIsRoleLimited,
  salesConsoleSalesCoachingReadModel,
  staleCoachingDataIsVerifyFirst
} from "@/features/sales/sales-console-m9-sales-coaching";

describe("Sales Console sales coaching foundation", () => {
  it("keeps coaching insights explainable and coaching-only", () => {
    expect(coachingInsightsAreExplainable()).toBe(true);
    expect(salesConsoleSalesCoachingReadModel.insights.every((insight) => insight.coachingOnly)).toBe(true);
  });

  it("does not create hidden scoring or punitive automation", () => {
    expect(coachingHasNoHiddenScoringOrPunitiveAutomation()).toBe(true);
  });

  it("keeps coaching visibility role-limited", () => {
    expect(coachingVisibilityIsRoleLimited()).toBe(true);
  });

  it("treats stale coaching data as verify-first", () => {
    expect(staleCoachingDataIsVerifyFirst()).toBe(true);
  });
});
