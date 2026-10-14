import { describe, expect, it } from "vitest";

import {
  aiActionsRequireFutureAuditAndPermissionCoverage,
  aiCannotExecuteRiskyActions,
  aiRecommendationsAreAdvisoryOnly,
  aiRecommendationsHaveEvidenceReasonAndConfidence,
  salesConsoleAiNextBestActionReadModel
} from "@/features/sales/sales-console-m9-ai-next-best-action";

describe("Sales Console AI next-best-action foundation", () => {
  it("keeps AI recommendations advisory-only", () => {
    expect(aiRecommendationsAreAdvisoryOnly()).toBe(true);
    expect(salesConsoleAiNextBestActionReadModel.recommendations.every((item) => item.autoExecute === false)).toBe(true);
  });

  it("requires evidence, reason, confidence, and source records", () => {
    expect(aiRecommendationsHaveEvidenceReasonAndConfidence()).toBe(true);
  });

  it("blocks risky actions from AI execution", () => {
    expect(aiCannotExecuteRiskyActions()).toBe(true);
    for (const item of salesConsoleAiNextBestActionReadModel.recommendations) {
      expect(item.blockedActions).toEqual(expect.arrayContaining(["message", "quote", "hold", "approve", "finance-decide", "mutate-crm-dms"]));
    }
  });

  it("requires future audit and permission coverage before user action activation", () => {
    expect(aiActionsRequireFutureAuditAndPermissionCoverage()).toBe(true);
  });
});
