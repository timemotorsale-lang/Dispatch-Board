import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Phase7MechanicalShadowReviewPanel } from "@/features/diagnostics/phase-7-mechanical-shadow-review-panel";
import { evaluatePhase7MechanicalNextTestReadiness } from "@/server/diagnostics/phase-7-mechanical-next-test-readiness";
import { PHASE_7_MECHANICAL_PROOF_CORPUS, evaluatePhase7MechanicalProofScenario } from "@/server/diagnostics/phase-7-mechanical-proof";

const environment = {
  sourceAuthorized: true,
  controlledHazards: ["LIFTING_AND_WHEEL_REMOVAL", "BRAKE_DUST_HANDLING", "BRAKE_SAFETY_CRITICAL_SYSTEM", "TOXIC_FLUID_HANDLING", "REFRIGERANT_PRESSURE", "ROTATING_COMPONENTS", "HOT_COOLANT_OR_HEATER_CIRCUIT", "HOT_EXHAUST", "IGNITION_HIGH_ENERGY", "ROTATING_ENGINE_COMPONENTS"],
  capabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["BRAKE_DIAGNOSIS_L2", "HVAC_DIAGNOSIS_L2", "DRIVABILITY_DIAGNOSIS_L2"],
  tools: ["LIFT_OR_SAFE_SUPPORT", "BRAKE_MEASUREMENT_TOOLS", "DIAL_INDICATOR", "MICROMETER", "BRAKE_PRESSURE_GAUGES", "SCAN_TOOL", "TEMPERATURE_PROBES", "HVAC_PRESSURE_GAUGES", "AIRFLOW_METER", "THERMAL_MEASUREMENT_TOOL", "OSCILLOSCOPE", "COMPRESSION_OR_PRESSURE_TRANSDUCER"],
  satisfiedPrerequisites: ["WHEEL_REMOVAL_SAFE_STATE", "BRAKE_FLUID_SAFE_HANDLING", "REFRIGERANT_SERVICE_NOT_REQUESTED", "HOT_COMPONENT_CONTACT_CONTROLLED", "IGNITION_TEST_SAFE_STATE", "ENGINE_MECHANICAL_TEST_SAFE_STATE"]
};

function readiness(id: string, overrides: Partial<Parameters<typeof evaluatePhase7MechanicalNextTestReadiness>[0]> = {}) {
  const scenario = PHASE_7_MECHANICAL_PROOF_CORPUS.find((item) => item.id === id)!;
  return evaluatePhase7MechanicalNextTestReadiness({
    diagnosticCaseId: `case-${id}`,
    reasoningEvaluationId: `reason-${id}`,
    proofResult: evaluatePhase7MechanicalProofScenario(scenario.input),
    now: "2026-07-22T22:00:00.000Z",
    vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: "STATIC_SAFE" },
    environment,
    ...overrides
  });
}

describe("Phase 7 mechanical shadow review panel", () => {
  it("renders brake recommendations with review-only authority", () => {
    const html = renderToStaticMarkup(<Phase7MechanicalShadowReviewPanel readiness={readiness("BRAKE-MEASUREMENT-001")} />);

    expect(html).toContain("Phase 7");
    expect(html).toContain("Brake recommendation");
    expect(html).toContain("Brake rotor runout measurement");
    expect(html).toContain("Review only");
    expect(html).toContain("Live execution locked");
    expect(html).toContain("Proof corpus");
    expect(html).not.toContain("Start test");
    expect(html).not.toContain("Approve repair");
  });

  it("renders HVAC and misfire family labels from readiness lineage", () => {
    const hvacHtml = renderToStaticMarkup(<Phase7MechanicalShadowReviewPanel readiness={readiness("HVAC-NORMAL-001", { vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: "ENGINE_RUNNING_OBSERVED" } })} />);
    const misfireHtml = renderToStaticMarkup(<Phase7MechanicalShadowReviewPanel readiness={readiness("MISFIRE-NORMAL-001", { vehicle: { make: "Generic", model: "Phase 7 Fixture", year: 2020, state: "ENGINE_RUNNING_OBSERVED" } })} />);

    expect(hvacHtml).toContain("HVAC recommendation");
    expect(hvacHtml).toContain("HVAC temperature and pressure profile");
    expect(misfireHtml).toContain("Misfire / drivability recommendation");
    expect(misfireHtml).toContain("Misfire scan context review");
  });

  it("shows fail-closed blockers instead of hiding missing readiness", () => {
    const blocked = readiness("BRAKE-MEASUREMENT-001", { environment: { ...environment, sourceAuthorized: false, controlledHazards: [] } });
    const html = renderToStaticMarkup(<Phase7MechanicalShadowReviewPanel readiness={blocked} />);

    expect(html).toContain("Next test is blocked");
    expect(html).toContain("Test source not authorized");
    expect(html).toContain("Test hazard uncontrolled:lifting and wheel removal");
    expect(html).toContain("acknowledgement capture remains a separate governed step");
  });

  it("preserves unsafe and no-fault-found holds without offering execution", () => {
    const unsafeHtml = renderToStaticMarkup(<Phase7MechanicalShadowReviewPanel readiness={readiness("HVAC-UNSAFE-001")} />);
    const noFaultHtml = renderToStaticMarkup(<Phase7MechanicalShadowReviewPanel readiness={readiness("MISFIRE-NFF-001")} />);

    expect(unsafeHtml).toContain("Escalation required");
    expect(noFaultHtml).toContain("No-fault-found hold");
    expect(`${unsafeHtml}${noFaultHtml}`).not.toContain("Start test");
  });
});
