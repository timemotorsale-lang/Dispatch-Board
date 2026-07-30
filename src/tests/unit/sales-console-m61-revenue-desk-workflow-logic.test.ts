import { describe, expect, it } from "vitest";

import {
  evaluateSalesRevenueDeskWorkflow,
  salesRevenueDeskCoversEveryLane
} from "@/features/sales/sales-console-m61-revenue-desk-workflow-logic";
import { salesConsoleRevenueLaneNames } from "@/features/sales/sales-console-operational-domain";

describe("Sales Console M61 revenue desk workflow logic", () => {
  it("covers every Time Motor Sales revenue lane", () => {
    expect(salesRevenueDeskCoversEveryLane()).toBe(true);
    expect(salesConsoleRevenueLaneNames).toEqual(
      expect.arrayContaining(["Public Auto Repair", "Daily Rental", "Warranty Product", "Financing Product"])
    );
  });

  it("requires missing lane fields before advancement", () => {
    const decision = evaluateSalesRevenueDeskWorkflow({
      lane: "Inventory Cash Sale",
      stage: "Proposal",
      completedFields: ["customer"],
      blockerCodes: [],
      customerReady: true,
      sourceVerified: true,
      managerReviewOpen: false
    });

    expect(decision.canAdvanceInsideSalesConsole).toBe(false);
    expect(decision.nextAction).toContain("Complete");
    expect(decision.governedActions).toContain("quote submission");
  });

  it("triggers manager review for governed revenue lanes and blockers", () => {
    const decision = evaluateSalesRevenueDeskWorkflow({
      lane: "Inventory BHPH Sale",
      stage: "Compliance",
      completedFields: ["customer", "selected vehicle", "down payment intent", "proof checklist", "source link"],
      blockerCodes: ["PAY_STUB"],
      customerReady: true,
      sourceVerified: true,
      managerReviewOpen: false
    });

    expect(decision.managerReviewRequired).toBe(true);
    expect(decision.nextAction).toBe("Request or review manager guidance");
    expect(decision.sourceSystemHandoff).toEqual(expect.arrayContaining(["CRM", "Inventory", "Finance"]));
  });
});
