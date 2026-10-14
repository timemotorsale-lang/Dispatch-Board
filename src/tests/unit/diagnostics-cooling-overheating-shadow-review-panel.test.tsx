import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CoolingOverheatingShadowReviewPanel } from "@/features/diagnostics/cooling-overheating-shadow-review-panel";
import { createCoolingOverheatingShadowAcknowledgement } from "@/server/diagnostics/cooling-overheating-shadow-acknowledgement";
import { evaluateCoolingOverheatingNextTestReadiness } from "@/server/diagnostics/cooling-overheating-next-test-readiness";
import { COOLING_OVERHEATING_PROOF_CORPUS, evaluateCoolingOverheatingProofScenario } from "@/server/diagnostics/cooling-overheating-proof";

const base = {
  diagnosticCaseId: "case-cool-1",
  reasoningEvaluationId: "reason-cool-1",
  now: "2026-07-22T20:00:00.000Z",
  vehicle: { make: "Generic", model: "Cooling Fixture", year: 2020, state: "STATIC_SAFE" },
  environment: {
    sourceAuthorized: true,
    systemCoolEnoughForSafeAccess: true,
    rotatingFanHazardControlled: true,
    toxicFluidHandlingReady: true,
    capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
    qualifications: ["COOLING_SYSTEM_L2"],
    tools: ["COOLING_PRESSURE_TESTER", "SCAN_TOOL", "THERMAL_MEASUREMENT_TOOL", "CALIBRATED_DVOM", "COMBUSTION_GAS_TESTER"]
  }
};

function readiness(family: string, overrides: Partial<typeof base> = {}) {
  const scenario = COOLING_OVERHEATING_PROOF_CORPUS.find((item) => item.family === family)!;
  return evaluateCoolingOverheatingNextTestReadiness({ ...base, ...overrides, proofResult: evaluateCoolingOverheatingProofScenario(scenario.input) });
}

describe("DGN-060 cooling shadow review panel", () => {
  it("renders the technician review boundary without execution authority", () => {
    const html = renderToStaticMarkup(<CoolingOverheatingShadowReviewPanel readiness={readiness("COOLANT_LEAK")} />);

    expect(html).toContain("DGN-060");
    expect(html).toContain("Advanced cooling recommendation");
    expect(html).toContain("Cooling pressure integrity");
    expect(html).toContain("Review only");
    expect(html).toContain("Live execution locked");
    expect(html).toContain("Result checksum");
    expect(html).not.toContain("Start test");
    expect(html).not.toContain("Approve repair");
  });

  it("shows fail-closed blockers instead of hiding missing readiness", () => {
    const blocked = readiness("COOLANT_LEAK", {
      environment: { ...base.environment, sourceAuthorized: false, systemCoolEnoughForSafeAccess: false }
    });
    const html = renderToStaticMarkup(<CoolingOverheatingShadowReviewPanel readiness={blocked} />);

    expect(html).toContain("Next test is blocked");
    expect(html).toContain("Test source not authorized");
    expect(html).toContain("Test hazard uncontrolled:hot pressurized coolant");
  });

  it("renders acknowledgement capture as review-only lineage", () => {
    const ready = readiness("COOLANT_LEAK");
    const acknowledgement = createCoolingOverheatingShadowAcknowledgement({
      diagnosticCaseId: "case-cool-1",
      readiness: ready,
      actorUserId: "tech-1",
      decision: "REVIEWED",
      selectedTestKey: ready.recommendedTestKey,
      reason: "Reviewed the cooling shadow recommendation and kept it in review-only status.",
      acknowledgedAt: "2026-07-22T20:05:00.000Z"
    });
    const html = renderToStaticMarkup(<CoolingOverheatingShadowReviewPanel acknowledgement={acknowledgement} readiness={ready} />);

    expect(html).toContain("Technician acknowledgement");
    expect(html).toContain("Acknowledgement only");
    expect(html).toContain("not test execution authority");
    expect(html).not.toContain("Start test");
  });
});
