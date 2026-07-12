import { describe, expect, it } from "vitest";

import { CASE_PLAYBOOK_DECISION_TYPE, CASE_PLAYBOOK_VERSION, CASE_SEVERITY_DECISION_TYPE, CASE_SEVERITY_VERSION, casePlaybookEvaluator, caseSeverityEvaluator } from "@/server/customers/decisions/case-decision-evaluators";

describe("customer case decision evaluators", () => {
  it("scores case severity and applies automatic critical triggers", () => {
    const scored = caseSeverityEvaluator.evaluate({ decisionType: CASE_SEVERITY_DECISION_TYPE, algorithmVersion: CASE_SEVERITY_VERSION, subject: { type: "CASE", id: "case-1" }, facts: { safetyRisk: 20, legalRisk: 15, mobilityImpact: 10, financialExposure: 5, ageAndMissedCommitments: 5, reputationalRisk: 2, informationComplete: true } });
    expect(scored).toMatchObject({ score: 57, priority: "P1", managerReviewRequired: true, confidence: "HIGH" });
    const critical = caseSeverityEvaluator.evaluate({ decisionType: CASE_SEVERITY_DECISION_TYPE, algorithmVersion: CASE_SEVERITY_VERSION, subject: { type: "CASE", id: "case-2" }, facts: { immediateSafetyConcern: true, informationComplete: false } });
    expect(critical).toMatchObject({ score: 100, priority: "P0", confidence: "LOW", reasonCodes: ["AUTOMATIC_CRITICAL_TRIGGER"] });
  });

  it("selects a category playbook and falls back to manager review", () => {
    const title = casePlaybookEvaluator.evaluate({ decisionType: CASE_PLAYBOOK_DECISION_TYPE, algorithmVersion: CASE_PLAYBOOK_VERSION, subject: { type: "CASE", id: "case-1" }, facts: { category: "DOCUMENTATION_TITLE" } });
    expect(title.recommendedActionCode).toBe("TITLE_DELAY_V1");
    const unknown = casePlaybookEvaluator.evaluate({ decisionType: CASE_PLAYBOOK_DECISION_TYPE, algorithmVersion: CASE_PLAYBOOK_VERSION, subject: { type: "CASE", id: "case-2" }, facts: { category: "UNKNOWN" } });
    expect(unknown).toMatchObject({ recommendedActionCode: "MANAGER_REVIEW_V1", managerReviewRequired: true });
  });
});
