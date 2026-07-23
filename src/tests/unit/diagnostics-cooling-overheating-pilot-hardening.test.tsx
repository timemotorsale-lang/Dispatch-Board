import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CoolingOverheatingManagerReviewCard } from "@/features/diagnostics/cooling-overheating-manager-review-card";
import { buildCoolingOverheatingAcknowledgementHistory } from "@/server/diagnostics/cooling-overheating-acknowledgement-history";
import { createCoolingOverheatingShadowAcknowledgement } from "@/server/diagnostics/cooling-overheating-shadow-acknowledgement";
import { evaluateCoolingOverheatingNextTestReadiness } from "@/server/diagnostics/cooling-overheating-next-test-readiness";
import { buildCoolingOverheatingManagerReviewCard, buildCoolingOverheatingPilotEvidencePackage, normalizeCoolingOverheatingAcknowledgementPersistenceCommand } from "@/server/diagnostics/cooling-overheating-pilot-hardening";
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

function acknowledgement(diagnosticCaseId: string, index: number) {
  const ready = readiness(diagnosticCaseId);
  return createCoolingOverheatingShadowAcknowledgement({
    diagnosticCaseId,
    readiness: ready,
    actorUserId: `tech-${index}`,
    decision: "REVIEWED",
    selectedTestKey: ready.recommendedTestKey,
    reason: "Reviewed the cooling shadow recommendation and kept it in review-only status.",
    acknowledgedAt: `2026-07-22T20:0${index}:00.000Z`
  });
}

describe("DGN-063-065 cooling pilot evidence hardening", () => {
  it("builds a manager review card from replay-safe acknowledgement history", () => {
    const history = buildCoolingOverheatingAcknowledgementHistory([acknowledgement("case-cool-1", 1), acknowledgement("case-cool-2", 2)]);
    const card = buildCoolingOverheatingManagerReviewCard(history);
    const html = renderToStaticMarkup(<CoolingOverheatingManagerReviewCard card={card} />);

    expect(card).toMatchObject({ status: "READY_FOR_MANAGER_REVIEW", metrics: { acknowledgementCount: 2, caseCount: 2, executionAuthorizedCount: 0 } });
    expect(card.cardChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(html).toContain("DGN-063");
    expect(html).toContain("Cooling shadow acknowledgement history");
    expect(html).toContain("Manager review cannot authorize live testing");
  });

  it("normalizes an append-only persistence command without creating execution authority", () => {
    const ack = acknowledgement("case-cool-1", 1);
    const command = normalizeCoolingOverheatingAcknowledgementPersistenceCommand({
      expectedCaseVersion: 4,
      idempotencyKey: "persist-cooling-ack-1",
      reason: "Persist reviewed cooling shadow acknowledgement for manager replay.",
      acknowledgement: ack
    });

    expect(command).toMatchObject({ appendOnly: true, diagnosticCaseId: "case-cool-1", acknowledgementChecksum: ack.acknowledgementChecksum, authorityBoundary: { liveExecutionAuthorized: false } });
    expect(command.commandChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(() => normalizeCoolingOverheatingAcknowledgementPersistenceCommand({ expectedCaseVersion: 4, idempotencyKey: "bad", reason: "Attempt authority.", acknowledgement: { ...ack, executionAuthorized: true } })).toThrow("cannot record execution authority");
  });

  it("builds a blocked pilot evidence package until representative acknowledgement evidence exists", () => {
    const single = buildCoolingOverheatingPilotEvidencePackage({ occurredAt: "2026-07-22T20:10:00.000Z", builtBy: "manager-1", acknowledgements: [acknowledgement("case-cool-1", 1)], representativeCaseMinimum: 2 });
    const ready = buildCoolingOverheatingPilotEvidencePackage({ occurredAt: "2026-07-22T20:10:00.000Z", builtBy: "manager-1", acknowledgements: [acknowledgement("case-cool-1", 1), acknowledgement("case-cool-2", 2)], representativeCaseMinimum: 2 });

    expect(single.status).toBe("BLOCKED");
    expect(single.holdCodes).toContain("DGN065_REPRESENTATIVE_ACK_HISTORY_REQUIRED");
    expect(ready).toMatchObject({ status: "READY_FOR_PILOT_EVIDENCE_REVIEW", authorityBoundary: { controlledPilotAuthorized: false, productionAuthorized: false } });
    expect(ready.evidenceRecords.map((record) => record.key)).toEqual(["PROOF_CORPUS", "ACKNOWLEDGEMENT_HISTORY", "MANAGER_REVIEW_CARD", "PERSISTENCE_BOUNDARY"]);
    expect(ready.packageChecksum).toMatch(/^[0-9a-f]{64}$/);
  });
});
