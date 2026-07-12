import { describe, expect, it } from "vitest";

import { createCrmDecisionRegistry } from "@/server/customers/decisions/crm-decision-registry";
import {
  LEAD_ASSIGNMENT_DECISION_TYPE,
  LEAD_ASSIGNMENT_VERSION,
  LEAD_PRIORITY_DECISION_TYPE,
  LEAD_PRIORITY_VERSION,
  leadAssignmentEvaluator,
  leadPriorityEvaluator
} from "@/server/customers/decisions/lead-decision-evaluators";

const registry = createCrmDecisionRegistry([leadPriorityEvaluator, leadAssignmentEvaluator]);

describe("lead decision evaluators", () => {
  it("scores a high-intent, reachable lead as P1", () => {
    const result = registry.evaluate({
      decisionType: LEAD_PRIORITY_DECISION_TYPE,
      algorithmVersion: LEAD_PRIORITY_VERSION,
      subject: { type: "LEAD", id: "lead-1" },
      customerId: "customer-1",
      facts: {
        evaluatedAt: "2026-07-12T19:00:00.000Z",
        purchaseTimeframeDays: 7,
        engagementLevel: "TWO_WAY",
        appointmentIntent: true,
        vehicleFit: "AVAILABLE",
        financingOrTradeReadiness: "COMPLETE",
        reachableContactCount: 2,
        priorPositiveRelationship: true
      }
    });
    expect(result).toMatchObject({ score: 100, priority: "P1", confidence: "HIGH", recommendedActionCode: "CALL_AND_CONFIRM_NEXT_STEP" });
    expect(result.dueAt).toBe("2026-07-12T19:10:00.000Z");
  });

  it("blocks prohibited contact and requires review", () => {
    const result = leadPriorityEvaluator.evaluate({
      decisionType: LEAD_PRIORITY_DECISION_TYPE, algorithmVersion: LEAD_PRIORITY_VERSION,
      subject: { type: "LEAD", id: "lead-2" }, facts: { evaluatedAt: "2026-07-12T19:00:00.000Z", doNotContact: true }
    });
    expect(result).toMatchObject({ priority: null, managerReviewRequired: true, reasonCodes: ["DO_NOT_CONTACT_RESTRICTION"] });
  });

  it("selects an eligible owner deterministically and excludes full capacity", () => {
    const result = registry.evaluate({
      decisionType: LEAD_ASSIGNMENT_DECISION_TYPE, algorithmVersion: LEAD_ASSIGNMENT_VERSION,
      subject: { type: "LEAD", id: "lead-1" }, facts: { candidates: [
        { userId: "full", eligible: true, availability: 30, openHotLeadCount: 12, capacityLimit: 12, continuity: 20, skillFit: 15, rotation: 10 },
        { userId: "available-b", eligible: true, availability: 30, openHotLeadCount: 1, capacityLimit: 12, continuity: 0, skillFit: 15, rotation: 10 },
        { userId: "available-a", eligible: true, availability: 30, openHotLeadCount: 1, capacityLimit: 12, continuity: 0, skillFit: 15, rotation: 10 }
      ] }
    });
    expect(result.recommendedOwnerId).toBe("available-a");
  });
});
