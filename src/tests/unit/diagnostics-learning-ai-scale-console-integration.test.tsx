import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { DiagnosticsCommandCenter } from "@/features/diagnostics/diagnostics-command-center";
import { evaluateDiagnosticLearningAiScaleReadiness } from "@/server/diagnostics/learning-ai-readiness";
import type { DiagnosticsCommandCenterModel } from "@/server/diagnostics/service";

const checksum = "c".repeat(64);

function readiness(overrides: Partial<Parameters<typeof evaluateDiagnosticLearningAiScaleReadiness>[0]> = {}) {
  return evaluateDiagnosticLearningAiScaleReadiness({
    occurredAt: "2026-07-23T07:00:00.000Z",
    requestedBy: "manager-1",
    query: { family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2024, configurationTags: ["CAN", "12V", "LOAD-SIDE"] }, symptoms: ["intermittent no crank", "voltage drop"], evidenceKeys: ["DVOM_DROP", "LOAD_TEST"], permissionTags: ["DIAGNOSTICS"] },
    verifiedCaseLibrary: [
      { caseId: "case-1", family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2020, configurationTags: ["CAN", "12V", "LOAD-SIDE"] }, symptoms: ["intermittent no crank", "voltage drop"], evidenceKeys: ["DVOM_DROP", "LOAD_TEST"], confirmedCauseKey: "HIGH_RESISTANCE_GROUND", verifiedOutcome: "VERIFIED_REPAIR", verificationChecksum: checksum, permissionTags: ["DIAGNOSTICS"], occurredAt: "2026-07-23T06:00:00.000Z" },
      { caseId: "case-2", family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2021, configurationTags: ["CAN", "12V"] }, symptoms: ["intermittent no crank"], evidenceKeys: ["DVOM_DROP"], confirmedCauseKey: "VOLTAGE_DROP_FEED", verifiedOutcome: "VERIFIED_REPAIR", verificationChecksum: checksum, permissionTags: ["DIAGNOSTICS"], occurredAt: "2026-07-23T06:10:00.000Z" },
      { caseId: "case-unverified", family: "ELECTRICAL_CIRCUIT", vehicle: { make: "Generic", model: "Fixture", year: 2022, configurationTags: ["CAN"] }, symptoms: ["intermittent no crank"], evidenceKeys: ["DVOM_DROP"], confirmedCauseKey: "UNKNOWN", verifiedOutcome: "INCONCLUSIVE", verificationChecksum: checksum, permissionTags: ["DIAGNOSTICS"], occurredAt: "2026-07-23T06:20:00.000Z" }
    ],
    calibration: { family: "ELECTRICAL_CIRCUIT", target: "TEST_ORDERING", proposalSummary: "Promote voltage-drop checks for verified intermittent no-crank cases.", sampleSize: 3, baselineAccuracy: 0.72, proposedAccuracy: 0.81, safetyRegressionCount: 0, independentApprovers: ["service-manager", "quality-lead"], rollbackPlanDocumented: true, shadowMonitoringDocumented: true },
    aiGateway: { mode: "SHADOW", providerNeutralRegistryReady: true, permissionFilteredRetrievalReady: true, citationsRequired: true, promptModelToolVersioningReady: true, privacyControlsReady: true, injectionControlsReady: true, outputValidationReady: true, telemetryReady: true, costLatencyLimitsReady: true, killSwitchVerified: true, disabledModeVerified: true, redTeamScenarioCount: 8, acceptanceSignedBy: ["service-manager", "security-owner"] },
    lowRiskAssistance: { citedSourceCount: 2, draftContentPresent: true, humanConfirmationRequired: true },
    advancedDrafts: { groundednessScore: 0.94, abstentionRate: 0.22, harmfulOutputFindings: 0, privacyFindings: 0, humanReviewWorkflowReady: true, offlineEvaluationComplete: true },
    enterpriseScale: { multiLocationPolicyInheritanceVerified: true, fleetSpecialtyPartitionsVerified: true, approvedAdapterIsolationVerified: true, licensedConnectorContractsVerified: true, telemetryIngestionGoverned: true, reconciliationAndDegradedBehaviorVerified: true, loadTestP95Ms: 420, recoveryPointObjectiveMinutes: 10, recoveryTimeObjectiveMinutes: 45, regionalDataControlsVerified: true, supportModelDocumented: true, changeGovernanceDocumented: true, serviceExtractionJustifiedByEvidence: true, acceptanceSignedBy: ["ops-owner", "security-owner"] },
    ...overrides
  });
}

function commandCenterModel(): DiagnosticsCommandCenterModel {
  return {
    state: "COMPLETE",
    freshness: "CURRENT",
    restricted: false,
    generatedAt: "2026-07-23T07:00:00.000Z",
    viewer: { id: "manager-1", name: "Manager One" },
    rollout: { executable: true, reason: "GENERAL", targetAt: "2026-07-22T00:00:00.000Z" },
    permissions: { canAssign: true, canCreate: true },
    operationalReadiness: {
      vinAndOemData: { label: "Controlled", state: "PILOT" },
      evidenceLedger: { label: "Healthy", state: "HEALTHY" },
      laborIntelligence: { label: "Pilot", state: "PILOT" },
      auditTrail: { label: "Active", state: "HEALTHY" }
    },
    learningAiScaleReadiness: readiness(),
    summary: { active: 0, awaitingTest: 0, blocked: 0, readyForHandoff: 0, mine: 0, waiting: 0, escalated: 0, unassigned: 0, today: { opened: 0, diagnosed: 0, verified: 0 } },
    items: []
  } as DiagnosticsCommandCenterModel;
}

describe("learning, AI, and scale console integration", () => {
  it("evaluates the grouped readiness bundle without granting authority", () => {
    const result = readiness();

    expect(result.status).toBe("READY_FOR_GOVERNED_REVIEW");
    expect(result.metrics).toMatchObject({ similarCaseMatches: 2, excludedCases: 1, redTeamScenarioCount: 8, enterpriseLoadP95Ms: 420 });
    expect(result.authorityBoundary).toMatchObject({ aiAuthorityGranted: false, productionLogicMutationAuthorized: false, externalConnectorActivationAuthorized: false, humanReviewRequired: true });
    expect(result.readinessChecksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("renders learning, AI, and scale readiness inside the Diagnostics Command Center", () => {
    const html = renderToStaticMarkup(<DiagnosticsCommandCenter model={commandCenterModel()} />);

    expect(html).toContain("Diagnostics Command Center");
    expect(html).toContain("Learning, AI, and scale readiness");
    expect(html).toContain("DGN-046-050 + DG-G10");
    expect(html).toContain("Verified similar cases");
    expect(html).toContain("Enterprise scale and ecosystem");
    expect(html).toContain("no AI authority");
    expect(html).toContain("No diagnostic cases match this view");
  });

  it("fails closed when AI safety or enterprise-scale evidence is incomplete", () => {
    const held = readiness({
      aiGateway: { mode: "SHADOW", providerNeutralRegistryReady: true, permissionFilteredRetrievalReady: true, citationsRequired: true, promptModelToolVersioningReady: true, privacyControlsReady: true, injectionControlsReady: false, outputValidationReady: true, telemetryReady: true, costLatencyLimitsReady: true, killSwitchVerified: true, disabledModeVerified: true, redTeamScenarioCount: 2, acceptanceSignedBy: ["service-manager"] },
      enterpriseScale: { multiLocationPolicyInheritanceVerified: true, fleetSpecialtyPartitionsVerified: true, approvedAdapterIsolationVerified: false, licensedConnectorContractsVerified: true, telemetryIngestionGoverned: true, reconciliationAndDegradedBehaviorVerified: true, loadTestP95Ms: 1_200, recoveryPointObjectiveMinutes: 10, recoveryTimeObjectiveMinutes: 90, regionalDataControlsVerified: true, supportModelDocumented: true, changeGovernanceDocumented: true, serviceExtractionJustifiedByEvidence: true, acceptanceSignedBy: ["ops-owner"] }
    });

    expect(held.status).toBe("HELD");
    expect(held.holdCodes).toEqual(expect.arrayContaining(["DGN048_AI_GATEWAY_READINESS_REQUIRED", "DGG10_ENTERPRISE_SCALE_EVIDENCE_REQUIRED"]));
  });
});
