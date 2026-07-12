import { describe, expect, it } from "vitest";

import {
  normalizeDecisionResult,
  type CrmDecisionEvaluationRequest,
  type CrmDecisionEvaluator
} from "@/server/customers/decisions/crm-decision-domain";
import { createCrmDecisionRegistry } from "@/server/customers/decisions/crm-decision-registry";

const request: CrmDecisionEvaluationRequest = {
  decisionType: "LEAD_PRIORITY",
  algorithmVersion: "lead-priority/1.0.0",
  subject: { type: "LEAD", id: "lead-1" },
  customerId: "customer-1",
  facts: { purchaseTimeframeDays: 7 }
};

function evaluator(): CrmDecisionEvaluator {
  return {
    decisionType: request.decisionType,
    algorithmVersion: request.algorithmVersion,
    evaluate(input) {
      return {
        decisionType: input.decisionType,
        algorithmVersion: input.algorithmVersion,
        subject: input.subject,
        customerId: input.customerId ?? null,
        score: 87,
        priority: "P1",
        recommendedOwnerId: "user-1",
        recommendedActionCode: "CALL_LEAD",
        dueAt: "2026-07-12T14:20:00-05:00",
        reasonCodes: ["BUYING_WITHIN_7_DAYS", "BUYING_WITHIN_7_DAYS"],
        explanation: "Customer plans to buy within seven days.",
        confidence: "HIGH",
        missingInputs: [],
        managerReviewRequired: false
      };
    }
  };
}

describe("CRM decision domain", () => {
  it("registers and deterministically evaluates an explicit algorithm version", () => {
    const registry = createCrmDecisionRegistry([evaluator()]);

    expect(registry.has(request.decisionType, request.algorithmVersion)).toBe(true);
    expect(registry.evaluate(request)).toMatchObject({ score: 87, priority: "P1" });
    expect(registry.list()).toEqual([
      { decisionType: "LEAD_PRIORITY", algorithmVersion: "lead-priority/1.0.0" }
    ]);
  });

  it("rejects duplicate and unsupported algorithm versions", () => {
    expect(() => createCrmDecisionRegistry([evaluator(), evaluator()])).toThrow(
      "Duplicate CRM decision evaluator"
    );
    expect(() => createCrmDecisionRegistry([]).evaluate(request)).toThrow(
      "Unsupported CRM decision algorithm"
    );
  });

  it("normalizes stable reason codes and rejects invalid results", () => {
    const result = normalizeDecisionResult(request, evaluator().evaluate(request));
    expect(result.reasonCodes).toEqual(["BUYING_WITHIN_7_DAYS"]);

    expect(() =>
      normalizeDecisionResult(request, { ...result, score: 101 })
    ).toThrow("Decision score must be a whole number from 0 through 100.");
    expect(() =>
      normalizeDecisionResult(request, { ...result, reasonCodes: ["free form"] })
    ).toThrow("stable uppercase reason-code format");
    expect(() =>
      normalizeDecisionResult(request, { ...result, subject: { type: "LEAD", id: "other" } })
    ).toThrow("result subject does not match");
  });
});
