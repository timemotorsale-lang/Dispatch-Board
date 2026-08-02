import { describe, expect, it } from "vitest";

import { evaluateTaiAcquisition, type TaiAcquisitionInput } from "@/features/prototype/tai-acquisition-rules";

const eligible: TaiAcquisitionInput = {
  acquisitionFees: 675,
  comparablesReviewed: true,
  conditionInspected: true,
  conditionRisk: 2,
  demandStrength: 5,
  expectedRetail: 31995,
  holdingReserve: 495,
  identityVerified: true,
  inventoryNeed: 4,
  marketPosition: 4,
  proposedPurchase: 23400,
  recon: 1650,
  riskReserve: 500,
  sellerAuthorityVerified: true,
  targetGross: 3250,
  titleAndDocs: 300,
  titleReviewed: true,
  transport: 525,
};

describe("evaluateTaiAcquisition", () => {
  it("calculates a retail-back ceiling and explainable buy recommendation", () => {
    const result = evaluateTaiAcquisition(eligible);

    expect(result.purchaseCeiling).toBe(24600);
    expect(result.totalInvestment).toBe(27545);
    expect(result.expectedGross).toBe(4450);
    expect(result.remainingRoom).toBe(1200);
    expect(result.acquisitionScore).toBe(91);
    expect(result.confidence).toBe("High");
    expect(result.blockers).toEqual([]);
    expect(result.recommendation).toBe("Buy");
    expect(result.explanation).toContain("$24,600");
  });

  it("holds the opportunity when identity and title evidence are missing", () => {
    const result = evaluateTaiAcquisition({ ...eligible, identityVerified: false, titleReviewed: false });

    expect(result.recommendation).toBe("Hold");
    expect(result.confidence).toBe("Low");
    expect(result.blockers).toContain("Vehicle identity is not verified");
    expect(result.blockers).toContain("Title and ownership risk is not reviewed");
  });

  it("watches an otherwise attractive vehicle when price exceeds the ceiling", () => {
    const result = evaluateTaiAcquisition({ ...eligible, proposedPurchase: 26000 });

    expect(result.purchaseCeiling).toBe(24600);
    expect(result.remainingRoom).toBe(-1400);
    expect(result.recommendation).toBe("Watch");
    expect(result.negativeDrivers).toContain("Proposed price is $1,400 above the purchase ceiling");
  });
});
