import { describe, expect, it } from "vitest";

import {
  getRevenueLaneContract,
  salesConsoleCoversEveryRevenueLane,
  salesConsoleRevenueContractsKeepRiskyActionsGoverned,
  salesConsoleRevenueContractsPreserveSourceOwnership,
  salesConsoleRevenueLaneContracts,
  salesConsoleRevenueLaneNames,
  salesConsoleRevenueOpportunities
} from "@/features/sales/sales-console-operational-domain";

describe("Sales Console M39 revenue domain contract", () => {
  it("covers every Time Motor Sales revenue lane", () => {
    expect(salesConsoleCoversEveryRevenueLane()).toBe(true);
    expect(salesConsoleRevenueLaneContracts.map((contract) => contract.lane)).toEqual([
      "Inventory Cash Sale",
      "Inventory BHPH Sale",
      "Inventory Lease-to-Own",
      "Public Auto Repair",
      "Daily Rental",
      "Warranty Product",
      "Financing Product"
    ]);
  });

  it("requires owner, stage, next action, source ownership, and guarded action state", () => {
    for (const opportunity of salesConsoleRevenueOpportunities) {
      expect(opportunity.owner).toBeTruthy();
      expect(opportunity.stage).toBeTruthy();
      expect(opportunity.nextAction).toBeTruthy();
      expect(opportunity.source.ownerSystem).toBeTruthy();
      expect(opportunity.actionState).toMatch(/Live Action|Controlled Action|Source-System Action|Future \/ Governed/);
    }
  });

  it("defines lane contracts with required fields and source owners", () => {
    expect(salesConsoleRevenueContractsPreserveSourceOwnership()).toBe(true);

    for (const lane of salesConsoleRevenueLaneNames) {
      const contract = getRevenueLaneContract(lane);

      expect(contract).toBeDefined();
      expect(contract?.requiredFields.length).toBeGreaterThanOrEqual(4);
      expect(contract?.mvpStageModel.length).toBeGreaterThanOrEqual(5);
      expect(contract?.allowedMvpActions.some((action) => /open|inspect|request|review/i.test(action))).toBe(true);
    }
  });

  it("keeps risky enterprise actions governed in the MVP contract", () => {
    expect(salesConsoleRevenueContractsKeepRiskyActionsGoverned()).toBe(true);
  });
});
