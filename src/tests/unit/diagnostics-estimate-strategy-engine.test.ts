import { describe, expect, it } from "vitest";

import { evaluateDiagnosticEstimateStrategies } from "@/server/diagnostics/estimate-strategy-engine";
import type { DiagnosticRepairOperation } from "@/server/diagnostics/repair-handoff-domain";

const operation: DiagnosticRepairOperation = {
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

describe("DGN-038 estimate strategy engine", () => {
  it("compares standard, three-tier, and elite strategy outputs without changing authority boundaries", () => {
    const result = evaluateDiagnosticEstimateStrategies({
      diagnosticCaseId: "case-1",
      repairOrderId: "ro-1",
      operations: [operation],
      laborRateCents: 17500,
      selectedStrategy: "THREE_TIER_LABOR_GUIDE_MODEL",
      compareStrategies: ["STANDARD_SHOP_MODEL", "THREE_TIER_LABOR_GUIDE_MODEL", "ELITE_ENTERPRISE_MODEL"],
      occurredAt: "2026-07-21T10:00:00.000Z"
    });

    expect(result.engineVersion).toBe("DGN-038/ESTIMATE-STRATEGY-ENGINE/1.0.0");
    expect(result.selectedOutput.strategy).toBe("THREE_TIER_LABOR_GUIDE_MODEL");
    expect(result.outputs).toHaveLength(3);
    expect(result.comparisons.map((comparison) => comparison.candidateStrategy)).toContain("ELITE_ENTERPRISE_MODEL");
    expect(result.authorityBoundary).toMatchObject({
      advisoryOnly: true,
      customerPresentationProhibited: true,
      authorizationProhibited: true,
      partsPurchaseProhibited: true,
      dispatchMutationProhibited: true,
      repairJobCreationProhibited: true
    });
  });

  it("keeps every strategy output checksum-bound and advisor-reviewable", () => {
    const result = evaluateDiagnosticEstimateStrategies({
      diagnosticCaseId: "case-1",
      repairOrderId: "ro-1",
      operations: [operation],
      laborRateCents: 17500,
      partPlaceholderUnitCents: 8500,
      selectedStrategy: "ELITE_ENTERPRISE_MODEL",
      compareStrategies: ["STANDARD_SHOP_MODEL"],
      occurredAt: "2026-07-21T10:00:00.000Z"
    });

    expect(result.selectedOutput.status).toBe("REVIEW_REQUIRED");
    expect(result.selectedOutput.outputChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(result.resultChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(result.selectedOutput.requiredApprovalCodes).toContain("ESTIMATE_STRATEGY_MANAGER_REVIEW_RECOMMENDED");
    expect(result.selectedOutput.draftLines[0]).toMatchObject({
      type: "LABOR",
      sourceOperationKey: "alternator-replacement"
    });
  });
});

