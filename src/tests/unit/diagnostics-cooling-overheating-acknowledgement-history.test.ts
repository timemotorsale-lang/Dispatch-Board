import { describe, expect, it } from "vitest";

import { buildCoolingOverheatingAcknowledgementHistory } from "@/server/diagnostics/cooling-overheating-acknowledgement-history";
import { createCoolingOverheatingShadowAcknowledgement } from "@/server/diagnostics/cooling-overheating-shadow-acknowledgement";
import { evaluateCoolingOverheatingNextTestReadiness } from "@/server/diagnostics/cooling-overheating-next-test-readiness";
import { COOLING_OVERHEATING_PROOF_CORPUS, evaluateCoolingOverheatingProofScenario } from "@/server/diagnostics/cooling-overheating-proof";

const environment = {
  sourceAuthorized: true,
  systemCoolEnoughForSafeAccess: true,
  rotatingFanHazardControlled: true,
  toxicFluidHandlingReady: true,
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["COOLING_SYSTEM_L2"],
  tools: ["COOLING_PRESSURE_TESTER", "SCAN_TOOL", "THERMAL_MEASUREMENT_TOOL", "CALIBRATED_DVOM", "COMBUSTION_GAS_TESTER"]
};

function readiness(diagnosticCaseId: string, family = "COOLANT_LEAK", sourceAuthorized = true) {
  const scenario = COOLING_OVERHEATING_PROOF_CORPUS.find((item) => item.family === family)!;
  return evaluateCoolingOverheatingNextTestReadiness({
    diagnosticCaseId,
    reasoningEvaluationId: `reason-${diagnosticCaseId}`,
    proofResult: evaluateCoolingOverheatingProofScenario(scenario.input),
    now: "2026-07-22T20:00:00.000Z",
    vehicle: { make: "Generic", model: "Cooling Fixture", year: 2020, state: "STATIC_SAFE" },
    environment: { ...environment, sourceAuthorized }
  });
}

describe("DGN-062 cooling acknowledgement history replay", () => {
  it("builds a deterministic manager-review history without execution authority", () => {
    const ready = readiness("case-cool-1");
    const blocked = readiness("case-cool-2", "COOLANT_LEAK", false);
    const records = [
      createCoolingOverheatingShadowAcknowledgement({ diagnosticCaseId: "case-cool-2", readiness: blocked, actorUserId: "tech-2", decision: "BLOCKER_ACKNOWLEDGED", reason: "Acknowledged source-rights blocker for the cooling recommendation.", acknowledgedAt: "2026-07-22T20:07:00.000Z" }),
      createCoolingOverheatingShadowAcknowledgement({ diagnosticCaseId: "case-cool-1", readiness: ready, actorUserId: "tech-1", decision: "REVIEWED", selectedTestKey: ready.recommendedTestKey, reason: "Reviewed the cooling shadow recommendation and kept it in review-only status.", acknowledgedAt: "2026-07-22T20:05:00.000Z" })
    ];

    const first = buildCoolingOverheatingAcknowledgementHistory(records);
    const second = buildCoolingOverheatingAcknowledgementHistory([...records].reverse());

    expect(first).toMatchObject({ replayOnly: true, pilotEvidenceOnly: true, managerReviewReady: true, replaySafe: true, recordCount: 2, caseCount: 2, executionAuthorizedCount: 0 });
    expect(first.byDecision).toMatchObject({ BLOCKER_ACKNOWLEDGED: 1, REVIEWED: 1 });
    expect(first.blockedCases).toEqual(["CASE-COOL-2"]);
    expect(first.latestByCase.map((item) => item.diagnosticCaseId)).toEqual(["case-cool-1", "case-cool-2"]);
    expect(first.historyChecksum).toBe(second.historyChecksum);
  });

  it("flags duplicate and authority-violating records as not replay safe", () => {
    const ready = readiness("case-cool-1");
    const record = createCoolingOverheatingShadowAcknowledgement({ diagnosticCaseId: "case-cool-1", readiness: ready, actorUserId: "tech-1", decision: "REVIEWED", selectedTestKey: ready.recommendedTestKey, reason: "Reviewed the cooling shadow recommendation and kept it in review-only status.", acknowledgedAt: "2026-07-22T20:05:00.000Z" });
    const tampered = { ...record, id: "tampered", executionAuthorized: true };

    const history = buildCoolingOverheatingAcknowledgementHistory([record, record, tampered]);

    expect(history).toMatchObject({ replaySafe: false, managerReviewReady: false, executionAuthorizedCount: 1 });
    expect(history.validationErrors).toEqual(expect.arrayContaining([`ACK_DUPLICATE_ID:${record.id.toUpperCase()}`, `ACK_DUPLICATE_CHECKSUM:${record.id.toUpperCase()}`, "ACK_AUTHORITY_VIOLATION:TAMPERED"]));
  });
});
