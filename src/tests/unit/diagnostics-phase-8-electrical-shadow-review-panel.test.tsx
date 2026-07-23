import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Phase8ElectricalShadowReviewPanel } from "@/features/diagnostics/phase-8-electrical-shadow-review-panel";
import { evaluatePhase8ElectricalNextTestReadiness } from "@/server/diagnostics/phase-8-electrical-next-test-readiness";
import { PHASE_8_ELECTRICAL_PROOF_CORPUS, evaluatePhase8ElectricalProofScenario } from "@/server/diagnostics/phase-8-electrical-proof";

const environment = {
  sourceAuthorized: true,
  controlledHazards: ["ELECTRICAL_SHORT_ARC", "BATTERY_ENERGY", "ROTATING_COMPONENTS", "HOT_EXHAUST", "ROAD_TEST_RISK", "MOVING_COMPONENTS"],
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["ELECTRICAL_DIAGNOSIS_L2", "WAVEFORM_DIAGNOSIS_L2", "INTERMITTENT_DIAGNOSIS_L2"],
  tools: ["DVOM_CAT_III", "INSPECTION_LIGHT", "LOAD_TOOL", "FUSED_JUMPER_SET", "OSCILLOSCOPE", "BACKPROBE_OR_BREAKOUT_LEADS", "SYNC_PROBE", "TRANSDUCER", "SCAN_TOOL", "CASE_NOTES", "DATA_LOGGER", "THERMAL_MEASUREMENT_TOOL"],
  satisfiedPrerequisites: ["BATTERY_SAFE_ACCESS_CONFIRMED", "CIRCUIT_LOAD_SAFE_STATE", "CIRCUIT_DEENERGIZED_CONFIRMED", "PROBE_CONNECTION_SAFE_STATE", "ROTATING_COMPONENT_CLEARANCE_CONFIRMED", "TRANSDUCER_SAFE_SETUP", "CAPTURE_WINDOW_DEFINED", "HARNESS_ACCESS_SAFE_STATE"]
};

function readiness(id: string, overrides: Partial<Parameters<typeof evaluatePhase8ElectricalNextTestReadiness>[0]> = {}) {
  const scenario = PHASE_8_ELECTRICAL_PROOF_CORPUS.find((item) => item.id === id)!;
  return evaluatePhase8ElectricalNextTestReadiness({
    diagnosticCaseId: `case-${id}`,
    reasoningEvaluationId: `reason-${id}`,
    proofResult: evaluatePhase8ElectricalProofScenario(scenario.input),
    now: "2026-07-23T03:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 8 Fixture", year: 2020, state: id.startsWith("WAVE") ? "ENGINE_RUNNING_OBSERVED" : "STATIC_SAFE" },
    environment,
    ...overrides
  });
}

describe("Phase 8 electrical shadow review panel", () => {
  it("renders electrical recommendations with review-only authority", () => {
    const html = renderToStaticMarkup(<Phase8ElectricalShadowReviewPanel readiness={readiness("ELEC-NORMAL-001")} />);

    expect(html).toContain("Phase 8");
    expect(html).toContain("Electrical circuit recommendation");
    expect(html).toContain("Electrical voltage drop under load");
    expect(html).toContain("Review only");
    expect(html).toContain("Live execution locked");
    expect(html).toContain("Proof corpus");
    expect(html).not.toContain("Start test");
    expect(html).not.toContain("Approve repair");
  });

  it("renders waveform and intermittent family labels from readiness lineage", () => {
    const waveformHtml = renderToStaticMarkup(<Phase8ElectricalShadowReviewPanel readiness={readiness("WAVE-NORMAL-001")} />);
    const intermittentHtml = renderToStaticMarkup(<Phase8ElectricalShadowReviewPanel readiness={readiness("INT-NORMAL-001")} />);

    expect(waveformHtml).toContain("Waveform analysis recommendation");
    expect(waveformHtml).toContain("Waveform scope setup and capture");
    expect(intermittentHtml).toContain("Intermittent fault recommendation");
    expect(intermittentHtml).toContain("Intermittent reproduction plan");
  });

  it("shows fail-closed blockers instead of hiding missing readiness", () => {
    const blocked = readiness("ELEC-NORMAL-001", { environment: { ...environment, sourceAuthorized: false, controlledHazards: [] } });
    const html = renderToStaticMarkup(<Phase8ElectricalShadowReviewPanel readiness={blocked} />);

    expect(html).toContain("Next test is blocked");
    expect(html).toContain("Test source not authorized");
    expect(html).toContain("Test hazard uncontrolled:electrical short arc");
    expect(html).toContain("acknowledgement capture remains a separate governed step");
  });

  it("preserves unsafe and no-fault-found holds without offering execution", () => {
    const unsafeHtml = renderToStaticMarkup(<Phase8ElectricalShadowReviewPanel readiness={readiness("WAVE-UNSAFE-001")} />);
    const noFaultHtml = renderToStaticMarkup(<Phase8ElectricalShadowReviewPanel readiness={readiness("INT-NFF-001")} />);

    expect(unsafeHtml).toContain("Escalation required");
    expect(noFaultHtml).toContain("No-fault-found hold");
    expect(`${unsafeHtml}${noFaultHtml}`).not.toContain("Start test");
  });
});
