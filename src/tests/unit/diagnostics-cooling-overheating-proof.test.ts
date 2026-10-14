import { describe, expect, it } from "vitest";

import { COOLING_OVERHEATING_PROOF_CORPUS, evaluateCoolingOverheatingProofScenario, runCoolingOverheatingProofCorpus } from "@/server/diagnostics/cooling-overheating-proof";

describe("DGN-058 cooling and overheating proof corpus", () => {
  it("passes all nine required cooling scenario families deterministically", () => {
    const first = runCoolingOverheatingProofCorpus();
    const second = runCoolingOverheatingProofCorpus();

    expect(first).toMatchObject({ simulationOnly: true, blindedEvaluation: true, scenarioCount: 9, passed: true });
    expect(first.familyCoverage).toHaveLength(9);
    expect(first.corpusChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(first.runChecksum).toBe(second.runChecksum);
  });

  it("does not let a misleading code override direct cooling evidence", () => {
    const scenario = COOLING_OVERHEATING_PROOF_CORPUS.find((item) => item.family === "MISLEADING_CODE")!;

    expect(evaluateCoolingOverheatingProofScenario(scenario.input)).toMatchObject({
      disposition: "CONFIRMED",
      hypothesisKeys: ["FLOW_RESTRICTION"],
      reasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"]
    });
  });

  it("escalates unsafe and high-voltage thermal scenarios", () => {
    const unsafe = COOLING_OVERHEATING_PROOF_CORPUS.find((item) => item.family === "UNSAFE")!;
    const highVoltage = evaluateCoolingOverheatingProofScenario({
      ...unsafe.input,
      safetyBlocked: false,
      highVoltageThermalSystem: true
    });

    expect(evaluateCoolingOverheatingProofScenario(unsafe.input)).toMatchObject({ disposition: "ESCALATED", reasonCodes: expect.arrayContaining(["SAFETY_HOT_PRESSURIZED_SYSTEM_STOP"]) });
    expect(highVoltage).toMatchObject({ disposition: "ESCALATED", reasonCodes: expect.arrayContaining(["DG_G7_HIGH_VOLTAGE_THERMAL_ESCALATION_REQUIRED"]) });
  });

  it("rejects any scenario not isolated as training-only", () => {
    const scenario = { ...COOLING_OVERHEATING_PROOF_CORPUS[0], trainingOnly: false as true };

    expect(() => runCoolingOverheatingProofCorpus([scenario])).toThrow("not isolated from live case execution");
  });
});
