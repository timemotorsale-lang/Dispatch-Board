import { describe, expect, it } from "vitest";

import { evaluateDiagnosticLaborGuide } from "@/server/diagnostics/labor-guide-domain";
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

const bumperOperation: DiagnosticRepairOperation = {
  key: "front-bumper-cover-replace",
  description: "Replace front bumper cover after collision impact.",
  workTypeCode: "BODY_REPLACE",
  durationMinutes: { minimum: 90, likely: 108, maximum: 150 },
  requiredSkills: ["BODY_TECHNICIAN"],
  requiredCertifications: [],
  bayRequirements: ["BODY_REPAIR_BAY"],
  toolRequirements: ["BODY_HAND_TOOLS"],
  parts: [{ partKey: "BUMPER_COVER", description: "Front bumper cover", quantity: 1, fitmentBasis: "VIN and trim review required.", substituteReviewRequired: true }],
  hazards: ["ADAS_SENSOR_REVIEW"],
  procedures: ["Inspect absorber, reinforcement, sensor openings, and hidden damage."],
  qcChecks: ["Verify panel fitment and sensor openings."]
};

describe("DGN-039 labor guide foundation", () => {
  it("matches mechanical repair operations to governed internal labor guide entries", () => {
    const result = evaluateDiagnosticLaborGuide({ operations: [alternatorOperation], occurredAt: "2026-07-21T10:00:00.000Z" });
    expect(result.version).toBe("DGN-039/LABOR-GUIDE-FOUNDATION/1.0.0");
    expect(result.summary.mechanicalOperationCount).toBe(1);
    expect(result.recommendations[0]).toMatchObject({
      matchedCatalogOperationKey: "MECH_ALTERNATOR_R_AND_R",
      domain: "MECHANICAL",
      operationType: "MECHANICAL_R_AND_R",
      complexityTier: "HIGH"
    });
    expect(result.recommendations[0]?.explanationCodes).toContain("LABOR_GUIDE_SOURCE_INTERNAL_AUTHORED");
    expect(result.recommendations[0]?.authorityBoundary.customerEstimateProhibited).toBe(true);
  });

  it("matches autobody collision operations and flags supplement review without parts or dispatch authority", () => {
    const result = evaluateDiagnosticLaborGuide({ operations: [bumperOperation], occurredAt: "2026-07-21T10:00:00.000Z" });
    expect(result.summary.autobodyOperationCount).toBe(1);
    expect(result.recommendations[0]).toMatchObject({
      matchedCatalogOperationKey: "BODY_FRONT_BUMPER_COVER_REPLACE",
      domain: "AUTOBODY",
      operationType: "BODY_REPLACE",
      complexityTier: "MEDIUM"
    });
    expect(result.recommendations[0]?.warningCodes).toContain("LABOR_GUIDE_SUPPLEMENT_REVIEW_RECOMMENDED");
    expect(result.recommendations[0]?.authorityBoundary).toMatchObject({
      advisoryOnly: true,
      partsMutationProhibited: true,
      dispatchMutationProhibited: true
    });
  });
});

