import { describe, expect, it } from "vitest";

import { evaluateDiagnosticEstimateStrategies } from "@/server/diagnostics/estimate-strategy-engine";
import { evaluateDiagnosticRelease3HandoffGates } from "@/server/diagnostics/release-3-handoff-gates-domain";
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

function strategyOutput() {
  return evaluateDiagnosticEstimateStrategies({
    diagnosticCaseId: "case-1",
    repairOrderId: "ro-1",
    operations: [operation],
    laborRateCents: 17500,
    partPlaceholderUnitCents: 8500,
    selectedStrategy: "ELITE_ENTERPRISE_MODEL",
    compareStrategies: ["STANDARD_SHOP_MODEL", "THREE_TIER_LABOR_GUIDE_MODEL"],
    occurredAt: "2026-07-21T10:00:00.000Z"
  }).selectedOutput;
}

describe("DGN-044 release 3 handoff gates", () => {
  it("blocks release handoff when advisor or manager review is missing", () => {
    const result = evaluateDiagnosticRelease3HandoffGates({
      diagnosticCaseId: "case-1",
      repairOrderId: "ro-1",
      conclusionChecksum: "a".repeat(64),
      repairHandoffChecksum: "b".repeat(64),
      selectedStrategyOutput: strategyOutput(),
      occurredAt: "2026-07-21T10:00:00.000Z",
      advisorReviewed: false,
      managerReviewed: false
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("RELEASE3_HANDOFF_ADVISOR_REVIEW_REQUIRED");
    expect(result.reasonCodes).toContain("RELEASE3_HANDOFF_MANAGER_REVIEW_REQUIRED");
    expect(result.handoffPackets.every((packet) => packet.status === "BLOCKED")).toBe(true);
  });

  it("creates authority-scoped downstream review packets without cross-domain mutation", () => {
    const result = evaluateDiagnosticRelease3HandoffGates({
      diagnosticCaseId: "case-1",
      repairOrderId: "ro-1",
      conclusionChecksum: "a".repeat(64),
      repairHandoffChecksum: "b".repeat(64),
      selectedStrategyOutput: strategyOutput(),
      occurredAt: "2026-07-21T10:00:00.000Z",
      advisorReviewed: true,
      managerReviewed: true
    });

    expect(result.status).toBe("READY_FOR_HANDOFF_REVIEW");
    expect(result.handoffPackets.map((packet) => packet.targetAuthority)).toEqual([
      "REPAIR_ESTIMATE",
      "PARTS",
      "DISPATCH_CAPACITY",
      "CUSTOMER_OR_INSURANCE_REVIEW",
      "QUALITY_CONTROL"
    ]);
    expect(result.authorityBoundary).toMatchObject({
      estimateMutationProhibited: true,
      customerPresentationProhibited: true,
      insurerSubmissionProhibited: true,
      authorizationRequestProhibited: true,
      partsOrderProhibited: true,
      partsReservationProhibited: true,
      dispatchMutationProhibited: true,
      schedulingMutationProhibited: true,
      qcClosureProhibited: true
    });
    expect(result.resultChecksum).toMatch(/^[0-9a-f]{64}$/);
  });
});

