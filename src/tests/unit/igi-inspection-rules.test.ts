import { describe, expect, it } from "vitest";

import { evaluateIgiInspection, type IgiInspectionInput } from "@/features/prototype/igi-inspection-rules";

const readyForQc: IgiInspectionInput = {
  bodyworkChecklistComplete: true,
  bodyworkConditionReviewed: true,
  cosmeticConditionReviewed: true,
  criticalWarningsReviewed: true,
  diagnosticScanCaptured: true,
  equipmentReviewed: true,
  findingsStructured: true,
  findingsVersionLocked: true,
  identityMatchedToIntake: true,
  mechanicalChecklistComplete: true,
  merchandisingConditionReviewed: true,
  mobilitySafe: true,
  recallAndSafetyFlagsReviewed: true,
  roadTestCompleted: true,
  roadTestDecision: "Required",
  roadTestNotesRecorded: true,
  safetyCheckComplete: true,
  severityAssigned: true,
  triageOwnerAssigned: true,
  warningLightsRecorded: true,
};

describe("evaluateIgiInspection", () => {
  it("marks inspection ready for Initial QC when the full package is complete", () => {
    const result = evaluateIgiInspection(readyForQc);

    expect(result.readinessScore).toBe(100);
    expect(result.recommendation).toBe("Ready for Initial QC");
    expect(result.blockers).toEqual([]);
    expect(result.confidence).toBe("High");
  });

  it("holds inspection when multiple controlled facts are missing", () => {
    const result = evaluateIgiInspection({
      ...readyForQc,
      bodyworkChecklistComplete: false,
      bodyworkConditionReviewed: false,
      diagnosticScanCaptured: false,
      safetyCheckComplete: false,
      warningLightsRecorded: false,
    });

    expect(result.recommendation).toBe("Hold");
    expect(result.blockers).toContain("Identity or safety pre-check is incomplete");
    expect(result.blockers).toContain("Mechanical inspection or diagnostic evidence is incomplete");
    expect(result.blockers).toContain("Structured findings are incomplete");
    expect(result.negativeDrivers).toContain("Bodywork review still needs to be recorded");
  });

  it("blocks Initial QC handoff when the unit is unsafe to move", () => {
    const result = evaluateIgiInspection({
      ...readyForQc,
      roadTestDecision: "Unsafe",
      roadTestCompleted: false,
      roadTestNotesRecorded: false,
    });

    expect(result.recommendation).toBe("Hold");
    expect(result.blockers).toContain("Unsafe-to-move decision keeps the unit out of Initial QC");
  });
});
