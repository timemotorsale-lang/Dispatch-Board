import { describe, expect, it } from "vitest";

import { evaluateDiagnosticEstimateStrategies } from "@/server/diagnostics/estimate-strategy-engine";
import { DIAGNOSTIC_RELEASE_3_MILESTONES, evaluateDiagnosticRelease3AcceptanceAudit } from "@/server/diagnostics/release-3-acceptance-audit-domain";
import { evaluateDiagnosticRelease3HandoffGates } from "@/server/diagnostics/release-3-handoff-gates-domain";
import type { DiagnosticRelease3MilestoneEvidence, DiagnosticRelease3RolloutEvidence } from "@/server/diagnostics/release-3-acceptance-audit-domain";
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

const completeMilestoneEvidence: DiagnosticRelease3MilestoneEvidence[] = DIAGNOSTIC_RELEASE_3_MILESTONES.map((milestoneId) => ({
  milestoneId,
  implementedInSource: true,
  testsPassed: true,
  implementationRecordPublished: true
}));

const noRolloutEvidence: DiagnosticRelease3RolloutEvidence = {
  migrationsDeployed: false,
  runtimeNavigationEnabled: false,
  browserAccessibilityAcceptanceComplete: false,
  advisorEstimatorAcceptanceComplete: false,
  technicianAcceptanceComplete: false,
  licensedLaborSourceApproved: false,
  licensedPartsPricingApproved: false,
  downstreamAuthorityIntegrationApproved: false,
  pilotDatasetApproved: false,
  monitoringRollbackReady: false,
  productionFeatureFlagEnabled: false
};

function release3HandoffGateResult() {
  const selectedStrategyOutput = evaluateDiagnosticEstimateStrategies({
    diagnosticCaseId: "case-1",
    repairOrderId: "ro-1",
    operations: [operation],
    laborRateCents: 17500,
    partPlaceholderUnitCents: 8500,
    selectedStrategy: "ELITE_ENTERPRISE_MODEL",
    compareStrategies: ["STANDARD_SHOP_MODEL", "THREE_TIER_LABOR_GUIDE_MODEL"],
    occurredAt: "2026-07-21T10:00:00.000Z"
  }).selectedOutput;

  return evaluateDiagnosticRelease3HandoffGates({
    diagnosticCaseId: "case-1",
    repairOrderId: "ro-1",
    conclusionChecksum: "a".repeat(64),
    repairHandoffChecksum: "b".repeat(64),
    selectedStrategyOutput,
    occurredAt: "2026-07-21T10:00:00.000Z",
    advisorReviewed: true,
    managerReviewed: true
  });
}

describe("DGN-045 release 3 acceptance audit", () => {
  it("accepts complete Release 3 source evidence for Release 4 implementation while keeping rollout gated", () => {
    const result = evaluateDiagnosticRelease3AcceptanceAudit({
      occurredAt: "2026-07-21T11:00:00.000Z",
      auditRequestedBy: "diagnostics-release-manager",
      requestedRolloutMode: "DOCUMENTATION_AUDIT",
      release3HandoffGateResult: release3HandoffGateResult(),
      milestoneEvidence: completeMilestoneEvidence,
      rolloutEvidence: noRolloutEvidence
    });

    expect(result.status).toBe("ACCEPTED_FOR_RELEASE4_IMPLEMENTATION");
    expect(result.sourceFoundationStatus).toBe("COMPLETE");
    expect(result.rolloutDisposition).toBe("DOCUMENTATION_ONLY");
    expect(result.completedMilestones).toEqual(DIAGNOSTIC_RELEASE_3_MILESTONES);
    expect(result.warningCodes).toContain("DGN045_LABOR_TIME_REMAINS_DRAFT_INTELLIGENCE");
    expect(result.authorityBoundary).toMatchObject({
      customerFacingUseProhibited: true,
      laborTimeFinalAuthorityProhibited: true,
      aiActivationProhibited: true
    });
    expect(result.auditChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("blocks production rollout even when source evidence is complete", () => {
    const result = evaluateDiagnosticRelease3AcceptanceAudit({
      occurredAt: "2026-07-21T11:00:00.000Z",
      auditRequestedBy: "diagnostics-release-manager",
      requestedRolloutMode: "PRODUCTION",
      release3HandoffGateResult: release3HandoffGateResult(),
      milestoneEvidence: completeMilestoneEvidence,
      rolloutEvidence: { ...noRolloutEvidence, productionFeatureFlagEnabled: true }
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.rolloutDisposition).toBe("PRODUCTION_BLOCKED");
    expect(result.reasonCodes).toContain("DGN045_PRODUCTION_ROLLOUT_NOT_AUTHORIZED");
    expect(result.warningCodes).toContain("DGN045_PRODUCTION_FEATURE_FLAG_MUST_REMAIN_DISABLED");
  });

  it("blocks Release 4 acceptance when any Release 3 milestone evidence is incomplete", () => {
    const result = evaluateDiagnosticRelease3AcceptanceAudit({
      occurredAt: "2026-07-21T11:00:00.000Z",
      auditRequestedBy: "diagnostics-release-manager",
      requestedRolloutMode: "DOCUMENTATION_AUDIT",
      release3HandoffGateResult: release3HandoffGateResult(),
      milestoneEvidence: completeMilestoneEvidence.map((evidence) => evidence.milestoneId === "DGN-044" ? { ...evidence, testsPassed: false } : evidence),
      rolloutEvidence: noRolloutEvidence
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.sourceFoundationStatus).toBe("INCOMPLETE");
    expect(result.missingMilestones).toEqual(["DGN-044"]);
    expect(result.reasonCodes).toContain("DGN045_RELEASE3_SOURCE_EVIDENCE_INCOMPLETE");
  });
});
