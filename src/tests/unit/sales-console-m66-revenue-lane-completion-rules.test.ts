import { describe, expect, it } from "vitest";

import {
  evaluateSalesCompletionReadiness,
  salesCompletionGovernedActions,
  salesCompletionRulesByLane,
  salesCompletionRulesCoverEveryRevenueLane,
  salesCompletionRulesKeepRiskyActionsGoverned
} from "@/features/sales/sales-console-m66-revenue-lane-completion-rules";
import { salesConsoleRevenueLaneNames } from "@/features/sales/sales-console-operational-domain";

describe("Sales Console M66 revenue lane completion rules", () => {
  it("defines completion rules for every revenue lane", () => {
    expect(salesCompletionRulesCoverEveryRevenueLane()).toBe(true);

    for (const lane of salesConsoleRevenueLaneNames) {
      expect(salesCompletionRulesByLane[lane].some((rule) => rule.sourceOwner === "Sales Console Internal")).toBe(true);
    }
  });

  it("blocks completion when required cash-sale fields or evidence are missing", () => {
    const decision = evaluateSalesCompletionReadiness({
      lane: "Inventory Cash Sale",
      satisfied: ["customer-linked", "revenue-lane-selected", "salesperson-linked"],
      blockerSeverity: "none",
      evidenceIds: [],
      sourceLinks: [],
      managerReviewResolved: false
    });

    expect(decision.canRecordCompletedSale).toBe(false);
    expect(decision.missingRequirements.map((rule) => rule.code)).toEqual(
      expect.arrayContaining(["source-links-present", "vehicle-linked", "inventory-verified", "evidence-attached"])
    );
    expect(decision.sourceVerificationRequired).toBe(true);
  });

  it("requires stronger review and evidence gates for BHPH", () => {
    const decision = evaluateSalesCompletionReadiness({
      lane: "Inventory BHPH Sale",
      satisfied: [
        "customer-linked",
        "revenue-lane-selected",
        "source-links-present",
        "salesperson-linked",
        "sale-date-present",
        "source-verification-ready",
        "vehicle-linked",
        "bhph-proof-checklist",
        "down-payment-intent",
        "finance-handoff-labeled",
        "manager-review-resolved",
        "evidence-attached"
      ],
      blockerSeverity: "risk",
      evidenceIds: ["EVD-1"],
      sourceLinks: ["/customers/customer-360?customerId=CUST-1", "/vehicles/360/TMS22145"],
      managerReviewResolved: true
    });

    expect(decision.canRecordCompletedSale).toBe(true);
    expect(decision.managerReviewRequired).toBe(true);
    expect(decision.readinessScore).toBeGreaterThan(80);
  });

  it("keeps excluded enterprise workflows governed", () => {
    expect(salesCompletionRulesKeepRiskyActionsGoverned()).toBe(true);
    expect(salesCompletionGovernedActions).toEqual(
      expect.arrayContaining(["quote submission", "discount approval", "finance decision", "vehicle hold/reservation", "customer messaging", "contract execution"])
    );
  });
});
