import { describe, expect, it } from "vitest";

import type { DiagnosticExplanationPackage } from "@/server/diagnostics/capacity-explanation-domain";
import { evaluateDiagnosticRelease4OperationalReadiness } from "@/server/diagnostics/release-4-operational-readiness-domain";
import { buildDiagnosticPilotEvidenceSnapshot, createInMemoryDiagnosticPilotEvidenceRepository, getDiagnosticRelease4PilotReadiness } from "@/server/diagnostics/release-4-pilot-evidence-repository";
import { evaluateDiagnosticRelease4PilotGate } from "@/server/diagnostics/release-4-pilot-gate-domain";
import { evaluateDiagnosticRelease4PilotReplay } from "@/server/diagnostics/release-4-pilot-replay-domain";
import { evaluateDiagnosticRelease4ReviewApproval } from "@/server/diagnostics/release-4-review-approval-domain";

const checksum = "a".repeat(64);
const occurredAt = "2026-07-22T18:00:00.000Z";
const manager = { id: "manager-1", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const staff = { id: "staff-1", name: "Staff", email: "staff@example.com", isActive: true, roles: ["Technician"], duties: { direct: [], roleDefaults: [], all: [] } };

function operationalReadiness() {
  return evaluateDiagnosticRelease4OperationalReadiness({
    occurredAt,
    release3AcceptanceChecksum: checksum,
    release3AcceptedForRelease4: true,
    labor: {
      sourceId: "licensed-labor-source-1",
      sourceType: "LICENSED",
      sourceApproved: true,
      shopLaborPolicyVersion: "SHOP-LABOR/1.0",
      skillAndRateRulesComplete: true,
      advisorReviewed: true,
      managerReviewed: true
    },
    parts: {
      demandCandidateCount: 2,
      placeholderPriceCount: 0,
      fitmentReviewComplete: true,
      sourceConfidenceDocumented: true,
      partsPersonReviewed: true
    },
    dispatch: {
      capacityPacketCount: 1,
      skillConstraintsReviewed: true,
      bayConstraintsReviewed: true,
      toolConstraintsReviewed: true,
      dispatchReviewed: true
    }
  });
}

const draftBoundary = {
  draftOnly: true,
  customerPresentationProhibited: true,
  insurerSubmissionProhibited: true,
  authorizationRequestProhibited: true
} as const;

const packages: DiagnosticExplanationPackage[] = [
  { audience: "CUSTOMER", concern: "Concern", cause: "Cause", correction: "Correction", consequence: "Consequence", verification: "Verification", notIncluded: [], editRequired: true, explanationCodes: ["DRAFT"], authorityBoundary: draftBoundary },
  { audience: "INSURANCE", concern: "Concern", cause: "Cause", correction: "Correction", consequence: "Consequence", verification: "Verification", notIncluded: [], editRequired: true, explanationCodes: ["DRAFT"], authorityBoundary: draftBoundary }
];

function reviewApproval() {
  const operational = operationalReadiness();
  return evaluateDiagnosticRelease4ReviewApproval({
    occurredAt,
    operationalReadiness: operational,
    explanationPackages: packages,
    requiredApprovalTriggers: ["MARGIN_RISK", "SOURCE_GAP"],
    approvalLineage: [
      { approvalId: "approval-1", trigger: "MARGIN_RISK", decision: "APPROVED", decidedBy: "manager-1", decidedAt: occurredAt, reason: "Margin exception reviewed and accepted." },
      { approvalId: "approval-2", trigger: "SOURCE_GAP", decision: "APPROVED", decidedBy: "manager-1", decidedAt: occurredAt, reason: "Source limitation accepted for controlled replay." }
    ],
    advisorReviewed: true,
    editRequiredFlagsResolved: true
  });
}

function replay() {
  const review = reviewApproval();
  return evaluateDiagnosticRelease4PilotReplay({
    occurredAt,
    reviewApproval: review,
    cases: [
      { caseId: "mechanical-1", caseType: "MECHANICAL", guideLaborMinutes: 120, consoleLaborMinutes: 110, actualLaborMinutes: 100, consoleEstimateCents: 51000, actualEstimateCents: 50000, consoleAbstained: false, abstentionAppropriate: false, managerOverrideApplied: false, expectedItemCount: 5, missedItemCount: 0 },
      { caseId: "autobody-1", caseType: "AUTOBODY", guideLaborMinutes: 300, consoleLaborMinutes: null, actualLaborMinutes: 360, consoleEstimateCents: null, actualEstimateCents: 250000, consoleAbstained: true, abstentionAppropriate: true, managerOverrideApplied: true, expectedItemCount: 8, missedItemCount: 1 }
    ]
  });
}

describe("DGN-049-056 Release 4 pilot readiness", () => {
  it("builds review-only labor, parts, and capacity readiness packets", () => {
    const result = operationalReadiness();

    expect(result.status).toBe("READY_FOR_REVIEW_CONTROLS");
    expect(result.packets.map((packet) => packet.milestoneId)).toEqual(["DGN-049", "DGN-050", "DGN-051"]);
    expect(result.authorityBoundary).toMatchObject({
      finalLaborTimeAuthorityProhibited: true,
      automaticOrderingProhibited: true,
      schedulingMutationProhibited: true
    });
    expect(result.resultChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("blocks operational readiness when source and authority reviews are incomplete", () => {
    const result = evaluateDiagnosticRelease4OperationalReadiness({
      occurredAt,
      release3AcceptanceChecksum: "invalid",
      release3AcceptedForRelease4: false,
      labor: { sourceId: "", sourceType: "PLACEHOLDER", sourceApproved: false, shopLaborPolicyVersion: "", skillAndRateRulesComplete: false, advisorReviewed: false, managerReviewed: false },
      parts: { demandCandidateCount: 1, placeholderPriceCount: 1, fitmentReviewComplete: false, sourceConfidenceDocumented: false, partsPersonReviewed: false },
      dispatch: { capacityPacketCount: 0, skillConstraintsReviewed: false, bayConstraintsReviewed: false, toolConstraintsReviewed: false, dispatchReviewed: false }
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("DGN049_RELEASE3_ACCEPTANCE_REQUIRED");
    expect(result.reasonCodes).toContain("DGN050_PARTS_PERSON_REVIEW_REQUIRED");
    expect(result.reasonCodes).toContain("DGN051_CAPACITY_PACKET_REQUIRED");
  });

  it("requires resolved draft edits and immutable manager approval lineage", () => {
    const operational = operationalReadiness();
    const blocked = evaluateDiagnosticRelease4ReviewApproval({
      occurredAt,
      operationalReadiness: operational,
      explanationPackages: packages,
      requiredApprovalTriggers: ["HIGH_RISK_CASE"],
      approvalLineage: [],
      advisorReviewed: true,
      editRequiredFlagsResolved: false
    });
    const ready = reviewApproval();

    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.reasonCodes).toContain("DGN052_EDIT_REQUIRED_FLAGS_UNRESOLVED");
    expect(blocked.reasonCodes).toContain("DGN053_HIGH_RISK_CASE_APPROVAL_REQUIRED");
    expect(ready.status).toBe("READY_FOR_PILOT_REPLAY");
    expect(ready.authorityBoundary).toMatchObject({ customerSendProhibited: true, insurerSubmissionProhibited: true, approvalLineageAppendOnly: true });
  });

  it("measures representative mechanical and autobody replay evidence", () => {
    const result = replay();

    expect(result.status).toBe("REPLAY_ACCEPTED");
    expect(result.mechanicalCaseCount).toBe(1);
    expect(result.autobodyCaseCount).toBe(1);
    expect(result.metrics).toMatchObject({ meanConsoleVsActualLaborVariancePercent: 10, meanEstimateVariancePercent: 2, overrideRatePercent: 50, missedItemRatePercent: 7.7, abstentionQualityPercent: 100 });
    expect(result.caseChecksums).toHaveLength(2);
  });

  it("approves only a documented, reversible controlled pilot and never production", () => {
    const operational = operationalReadiness();
    const review = reviewApproval();
    const pilotReplay = replay();
    const common = {
      occurredAt,
      requestedBy: "diagnostics-release-manager",
      operationalReadiness: operational,
      reviewApproval: review,
      replay: pilotReplay,
      runtimeWorkflowAcceptanceComplete: true,
      roleTrainingComplete: true,
      monitoringPlanDocumented: true,
      rollbackPlanDocumented: true,
      pauseControlVerified: true,
      acceptanceSignedBy: ["SERVICE_MANAGER", "TECHNICIAN_LEAD"],
      unresolvedRisks: [{ riskId: "risk-1", disposition: "MITIGATED" as const, owner: "service-manager", note: "Fallback to the current manual workflow is verified." }]
    };
    const controlledPilot = evaluateDiagnosticRelease4PilotGate({ ...common, requestedMode: "CONTROLLED_PILOT" });
    const production = evaluateDiagnosticRelease4PilotGate({ ...common, requestedMode: "PRODUCTION" });

    expect(controlledPilot.dashboardStatus).toBe("CONTROLLED_PILOT_ELIGIBLE");
    expect(controlledPilot.gateDecision).toBe("APPROVED_FOR_CONTROLLED_PILOT");
    expect(controlledPilot.authorityBoundary.productionPromotionProhibited).toBe(true);
    expect(production.gateDecision).toBe("PRODUCTION_PROHIBITED");
    expect(production.holdCodes).toContain("DGN056_PRODUCTION_PROMOTION_NOT_AUTHORIZED");
  });

  it("keeps the manager dashboard blocked when the pilot evidence repository is empty", async () => {
    const model = await getDiagnosticRelease4PilotReadiness(manager, {
      now: () => new Date(occurredAt),
      repository: { getLatestEvidenceSnapshot: async () => null }
    });

    expect(model.evidenceRepositoryStatus).toBe("EMPTY");
    expect(model.result.gateDecision).toBe("HELD");
    expect(model.result.holdCodes).toContain("DGN055_OPERATIONAL_READINESS_BLOCKED");
  });

  it("builds a controlled-pilot gate result from repository evidence", async () => {
    const snapshot = buildDiagnosticPilotEvidenceSnapshot({
      evidenceSetId: "dg-g6-evidence-1",
      organizationId: "org-1",
      recordedAt: occurredAt,
      recordedBy: manager.id,
      requestedMode: "CONTROLLED_PILOT",
      operationalReadiness: operationalReadiness(),
      reviewApproval: reviewApproval(),
      replay: replay(),
      evidenceRecords: ["RUNTIME_WORKFLOW_ACCEPTANCE", "ROLE_TRAINING", "MONITORING_PLAN", "ROLLBACK_PLAN", "PAUSE_CONTROL"].map((key) => ({
        key: key as "RUNTIME_WORKFLOW_ACCEPTANCE",
        status: "ACCEPTED" as const,
        evidenceReference: `${key.toLowerCase()}-evidence`,
        reviewedBy: manager.id,
        reviewedAt: occurredAt,
        evidenceChecksum: checksum,
        note: "Accepted with documented operational evidence."
      })),
      acceptanceSignedBy: ["SERVICE_MANAGER", "TECHNICIAN_LEAD"],
      unresolvedRisks: [{ riskId: "risk-1", disposition: "MITIGATED", owner: "service-manager", note: "Fallback to the current manual workflow is verified." }]
    });
    const repository = createInMemoryDiagnosticPilotEvidenceRepository();
    await repository.recordEvidenceSnapshot?.(snapshot);
    const model = await getDiagnosticRelease4PilotReadiness(manager, {
      now: () => new Date(occurredAt),
      organizationId: "org-1",
      repository
    });

    expect(model.evidenceRepositoryStatus).toBe("LOADED");
    expect(model.evidenceRepositoryChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(model.result.gateDecision).toBe("APPROVED_FOR_CONTROLLED_PILOT");
    expect(model.result.authorityBoundary.productionPromotionProhibited).toBe(true);
  });

  it("requires manager access to read pilot evidence readiness", async () => {
    await expect(getDiagnosticRelease4PilotReadiness(staff, {
      repository: { getLatestEvidenceSnapshot: async () => null }
    })).rejects.toThrow("Manager access is required");
  });
});
