import { describe, expect, it } from "vitest";

import { evaluateDiagnosticCapacityExplanation } from "@/server/diagnostics/capacity-explanation-domain";
import { evaluateDiagnosticLaborGuide } from "@/server/diagnostics/labor-guide-domain";
import { evaluateDiagnosticPartsLaborEconomics } from "@/server/diagnostics/parts-labor-economics-domain";
import type { DiagnosticRepairOperation } from "@/server/diagnostics/repair-handoff-domain";

const alternatorOperation: DiagnosticRepairOperation = {
  key: "alternator-replacement",
  description: "Replace alternator assembly.",
  workTypeCode: "ELECTRICAL_REPAIR",
  durationMinutes: { minimum: 90, likely: 125, maximum: 160 },
  requiredSkills: ["ELECTRICAL_DIAGNOSTIC_REPAIR"],
  requiredCertifications: [],
  bayRequirements: ["SERVICE_BAY"],
  toolRequirements: ["HAND_TOOLS", "TORQUE_WRENCH"],
  parts: [{ partKey: "ALTERNATOR", description: "Alternator assembly", quantity: 1, fitmentBasis: "VIN review required.", substituteReviewRequired: true }],
  hazards: ["BATTERY_SAFE_WORK"],
  procedures: ["Disconnect battery and follow approved service information."],
  qcChecks: ["Verify charging voltage and no warning indicator returns."]
};

const adasBodyOperation: DiagnosticRepairOperation = {
  key: "adas-calibration-after-bumper",
  description: "Pre and post scan with front radar calibration after bumper impact.",
  workTypeCode: "ADAS_CALIBRATION",
  durationMinutes: { minimum: 60, likely: 90, maximum: 180 },
  requiredSkills: ["ADAS_CALIBRATION"],
  requiredCertifications: ["ADAS_QUALIFIED_REVIEW"],
  bayRequirements: ["CALIBRATION_SPACE"],
  toolRequirements: ["SCAN_TOOL", "CALIBRATION_TARGETS"],
  parts: [],
  hazards: ["SAFETY_SYSTEM_CALIBRATION_REQUIRED"],
  procedures: ["Perform pre-scan, calibration, post-scan, and evidence capture."],
  qcChecks: ["Verify calibration completion and no safety-system faults."]
};

function buildInput(operations: DiagnosticRepairOperation[]) {
  const laborGuide = evaluateDiagnosticLaborGuide({ operations, occurredAt: "2026-07-21T10:00:00.000Z" });
  const economics = evaluateDiagnosticPartsLaborEconomics({ operations, laborGuideRecommendations: laborGuide.recommendations, baseLaborRateCents: 17500, occurredAt: "2026-07-21T10:00:00.000Z" });
  return { laborGuide, economics };
}

describe("DGN-042-043 capacity impact and explanation package", () => {
  it("projects advisory mechanical capacity without scheduling or dispatch authority", () => {
    const { laborGuide, economics } = buildInput([alternatorOperation]);
    const result = evaluateDiagnosticCapacityExplanation({ diagnosticCaseId: "case-1", repairOrderId: "ro-1", operations: [alternatorOperation], laborGuideRecommendations: laborGuide.recommendations, economics, occurredAt: "2026-07-21T10:00:00.000Z" });

    expect(result.version).toBe("DGN-042-043/CAPACITY-EXPLANATION/1.0.0");
    expect(result.capacityImpact.requiredSkills).toContain("ELECTRICAL_DIAGNOSTIC_REPAIR");
    expect(result.capacityImpact.authorityBoundary).toMatchObject({
      advisoryOnly: true,
      dispatchMutationProhibited: true,
      schedulingMutationProhibited: true,
      appointmentPromiseProhibited: true
    });
    expect(result.explanationPackages.map((item) => item.audience)).toEqual(["CUSTOMER", "INTERNAL_ADVISOR"]);
  });

  it("creates insurance-quality draft explanation for autobody safety/calibration work", () => {
    const { laborGuide, economics } = buildInput([adasBodyOperation]);
    const result = evaluateDiagnosticCapacityExplanation({ diagnosticCaseId: "case-1", repairOrderId: "ro-1", operations: [adasBodyOperation], laborGuideRecommendations: laborGuide.recommendations, economics, occurredAt: "2026-07-21T10:00:00.000Z" });

    expect(result.explanationPackages.map((item) => item.audience)).toContain("INSURANCE");
    expect(result.warningCodes).toContain("CAPACITY_EXPLANATION_HIGH_RISK");
    expect(result.managerReviewCodes).toContain("CAPACITY_CERTIFICATION_MANAGER_REVIEW");
    expect(result.explanationPackages.find((item) => item.audience === "INSURANCE")?.authorityBoundary).toMatchObject({
      draftOnly: true,
      insurerSubmissionProhibited: true,
      authorizationRequestProhibited: true
    });
    expect(result.resultChecksum).toMatch(/^[0-9a-f]{64}$/);
  });
});

