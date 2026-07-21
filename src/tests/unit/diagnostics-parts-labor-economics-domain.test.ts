import { describe, expect, it } from "vitest";

import { evaluateDiagnosticLaborGuide } from "@/server/diagnostics/labor-guide-domain";
import { evaluateDiagnosticPartsLaborEconomics } from "@/server/diagnostics/parts-labor-economics-domain";
import type { DiagnosticRepairOperation } from "@/server/diagnostics/repair-handoff-domain";

const shortMechanicalOperation: DiagnosticRepairOperation = {
  key: "bulb-replacement",
  description: "Replace marker bulb.",
  workTypeCode: "MECHANICAL_REPAIR",
  durationMinutes: { minimum: 10, likely: 24, maximum: 45 },
  requiredSkills: ["MAINTENANCE_REPAIR"],
  requiredCertifications: [],
  bayRequirements: ["SERVICE_BAY"],
  toolRequirements: ["HAND_TOOLS"],
  parts: [{ partKey: "MARKER_BULB", description: "Marker bulb", quantity: 1, fitmentBasis: "VIN review required.", substituteReviewRequired: false }],
  hazards: [],
  procedures: ["Replace failed marker bulb."],
  qcChecks: ["Verify lamp operation."]
};

const refinishOperation: DiagnosticRepairOperation = {
  key: "tri-coat-refinish-blend",
  description: "Refinish and blend tri-coat front bumper and adjacent panel.",
  workTypeCode: "REFINISH",
  durationMinutes: { minimum: 150, likely: 210, maximum: 300 },
  requiredSkills: ["PAINTER"],
  requiredCertifications: [],
  bayRequirements: ["PAINT_BOOTH"],
  toolRequirements: ["PAINT_SYSTEM", "SPRAY_OUT_CARD"],
  parts: [{ partKey: "PAINT_MATERIALS", description: "Tri-coat paint materials and consumables", quantity: 1, fitmentBasis: "Operation derived.", substituteReviewRequired: false }],
  hazards: ["PAINT_HAZMAT"],
  procedures: ["Prepare, refinish, and blend adjacent panel."],
  qcChecks: ["Verify color match and finish quality."]
};

describe("DGN-040-041 parts and labor economics", () => {
  it("creates demand-signal-only part candidates with GP curve pricing and no purchase authority", () => {
    const laborGuide = evaluateDiagnosticLaborGuide({ operations: [shortMechanicalOperation], occurredAt: "2026-07-21T10:00:00.000Z" });
    const result = evaluateDiagnosticPartsLaborEconomics({ operations: [shortMechanicalOperation], laborGuideRecommendations: laborGuide.recommendations, baseLaborRateCents: 17500, partPlaceholderUnitCents: 1000, occurredAt: "2026-07-21T10:00:00.000Z" });

    expect(result.version).toBe("DGN-040-041/PARTS-LABOR-ECONOMICS/1.0.0");
    expect(result.partDemandCandidates[0]).toMatchObject({
      partKey: "MARKER_BULB",
      pricingStatus: "ESTIMATED",
      targetGrossProfitPercent: 45,
      authorityBoundary: {
        demandSignalOnly: true,
        purchaseMutationProhibited: true,
        reservationMutationProhibited: true
      }
    });
    expect(result.partDemandCandidates[0]?.recommendedSellPriceCents).toBeGreaterThan(1000);
  });

  it("applies visible minimum labor and short-job bump without hidden repricing", () => {
    const laborGuide = evaluateDiagnosticLaborGuide({ operations: [shortMechanicalOperation], occurredAt: "2026-07-21T10:00:00.000Z" });
    const result = evaluateDiagnosticPartsLaborEconomics({ operations: [shortMechanicalOperation], laborGuideRecommendations: laborGuide.recommendations, baseLaborRateCents: 17500, occurredAt: "2026-07-21T10:00:00.000Z" });

    expect(result.laborEconomics[0]).toMatchObject({
      guideMinutes: 24,
      billableMinutes: 60,
      minimumApplied: true,
      shortJobBumpApplied: true
    });
    expect(result.warningCodes).toContain("LABOR_ECONOMICS_MINIMUM_APPLIED");
    expect(result.authorityBoundary.hiddenRepricingProhibited).toBe(true);
  });

  it("adds visible autobody paint material economics and manager-review safeguards", () => {
    const laborGuide = evaluateDiagnosticLaborGuide({ operations: [refinishOperation], occurredAt: "2026-07-21T10:00:00.000Z" });
    const result = evaluateDiagnosticPartsLaborEconomics({ operations: [refinishOperation], laborGuideRecommendations: laborGuide.recommendations, baseLaborRateCents: 17500, partPlaceholderUnitCents: 4500, occurredAt: "2026-07-21T10:00:00.000Z" });

    expect(result.laborEconomics[0]?.materialChargeCents).toBeGreaterThan(0);
    expect(result.warningCodes).toContain("LABOR_ECONOMICS_MATERIAL_CHARGE_VISIBLE");
    expect(result.managerReviewCodes).toContain("LABOR_ECONOMICS_MATERIAL_DISCOUNT_REVIEW_REQUIRED");
    expect(result.resultChecksum).toMatch(/^[0-9a-f]{64}$/);
  });
});

