import { describe, expect, it } from "vitest";
import { evaluateNoStartProofScenario, NO_START_PROOF_CORPUS, runNoStartProofCorpus } from "@/server/diagnostics/no-start-proof";

describe("DGN-027 guided no-start proof corpus", () => {
  it("passes all nine required blinded scenario families deterministically", () => {
    const first = runNoStartProofCorpus(); const second = runNoStartProofCorpus([...NO_START_PROOF_CORPUS].reverse());
    expect(first).toMatchObject({ simulationOnly: true, blindedEvaluation: true, scenarioCount: 9, passed: true }); expect(first.familyCoverage).toHaveLength(9); expect(first.corpusChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(second.results.every((item) => item.passed)).toBe(true);
  });
  it("lets direct causal evidence defeat a misleading association", () => {
    const scenario = NO_START_PROOF_CORPUS.find((item) => item.family === "MISLEADING_CODE")!; expect(evaluateNoStartProofScenario(scenario.input)).toMatchObject({ disposition: "CONFIRMED", hypothesisKeys: ["GROUND_PATH"] });
  });
  it("abstains on conflicting measurement evidence", () => {
    const scenario = NO_START_PROOF_CORPUS.find((item) => item.family === "MEASUREMENT_ERROR")!; expect(evaluateNoStartProofScenario(scenario.input)).toMatchObject({ disposition: "ABSTAINED", reasonCodes: expect.arrayContaining(["DATA_CONFLICTING"]) });
  });
  it("keeps unsafe, degraded, and no-fault-found outcomes distinct", () => {
    const byFamily = Object.fromEntries(NO_START_PROOF_CORPUS.map((scenario) => [scenario.family, evaluateNoStartProofScenario(scenario.input).disposition])); expect(byFamily).toMatchObject({ UNSAFE: "ESCALATED", DEGRADED: "ABSTAINED", NO_FAULT_FOUND: "NO_FAULT_FOUND" });
  });
  it("rejects any scenario not isolated as training-only", () => {
    const unsafe = { ...NO_START_PROOF_CORPUS[0], trainingOnly: false as true }; expect(() => runNoStartProofCorpus([unsafe])).toThrow("not isolated from live case execution");
  });
});
