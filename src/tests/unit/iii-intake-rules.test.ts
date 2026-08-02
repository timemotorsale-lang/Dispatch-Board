import { describe, expect, it } from "vitest";

import { evaluateIiiIntake, type IiiIntakeInput } from "@/features/prototype/iii-intake-rules";

const readyForInspection: IiiIntakeInput = {
  canonicalVehicleLinked: true,
  currentCustodianRecorded: true,
  currentLocationRecorded: true,
  decodedFactsReviewed: true,
  duplicateCheckClear: true,
  frontlineTargetConfirmed: true,
  intakeNotesRecorded: true,
  inventoryOwnerConfirmed: true,
  inventoryUnitCreated: true,
  keysOnHandConfirmed: true,
  priority: "Priority",
  recallCampaignReviewed: true,
  requestedEvaluation: "Inspection only",
  retailPath: "Frontline retail",
  safetyDecision: "Clear",
  safetyWarningsReviewed: true,
  stockNumberAssigned: true,
  targetFrontlineDateRecorded: true,
  vinVerificationReviewed: true,
};

describe("evaluateIiiIntake", () => {
  it("marks intake ready for inspection when canonical, safety, objective, and custody facts are complete", () => {
    const result = evaluateIiiIntake(readyForInspection);

    expect(result.readinessScore).toBe(100);
    expect(result.recommendation).toBe("Ready for inspection");
    expect(result.blockers).toEqual([]);
    expect(result.confidence).toBe("High");
  });

  it("holds intake when multiple controlled facts are still missing", () => {
    const result = evaluateIiiIntake({
      ...readyForInspection,
      decodedFactsReviewed: false,
      recallCampaignReviewed: false,
      requestedEvaluation: "Pending",
      retailPath: "Pending decision",
      targetFrontlineDateRecorded: false,
      vinVerificationReviewed: false,
    });

    expect(result.recommendation).toBe("Hold");
    expect(result.blockers).toContain("Decoded vehicle facts are not reviewed");
    expect(result.blockers).toContain("Safety intelligence review is incomplete");
    expect(result.blockers).toContain("Inventory objective is incomplete");
  });

  it("prevents handoff when safety intelligence places the unit on hold", () => {
    const result = evaluateIiiIntake({
      ...readyForInspection,
      safetyDecision: "Hold",
    });

    expect(result.recommendation).toBe("Hold");
    expect(result.blockers).toContain("Safety intelligence placed the unit on hold");
    expect(result.negativeDrivers).toContain("Safety hold prevents movement into inspection");
  });
});
