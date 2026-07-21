import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const NO_START_PROOF_CORPUS_VERSION = "DGN-027/NO-START-CORPUS/1.0.0";
export type NoStartProofDisposition = "CONFIRMED" | "ABSTAINED" | "ESCALATED" | "NO_FAULT_FOUND";
export type NoStartProofSignal = { factKey: string; hypothesisKey: string; relationship: "DIRECT_SUPPORT" | "CAUSAL_SUPPORT" | "ASSOCIATION" | "CONTRADICTION"; independenceGroup: string };
export type NoStartProofScenario = {
  id: string; family: "NORMAL" | "MISLEADING_CODE" | "MEASUREMENT_ERROR" | "COMMON_GROUND" | "INTERMITTENT" | "MULTIPLE_FAULT" | "UNSAFE" | "DEGRADED" | "NO_FAULT_FOUND";
  trainingOnly: true; input: { safetyBlocked: boolean; sourceAvailable: boolean; computationComplete: boolean; concernReproduced: boolean; signals: NoStartProofSignal[] };
  expected: { disposition: NoStartProofDisposition; hypothesisKeys: string[]; requiredReasonCodes: string[] };
};

export type NoStartProofEngineResult = { disposition: NoStartProofDisposition; hypothesisKeys: string[]; reasonCodes: string[]; explanation: string[] };
const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical))].sort((a, b) => a.localeCompare(b));

export function evaluateNoStartProofScenario(input: NoStartProofScenario["input"]): NoStartProofEngineResult {
  if (input.safetyBlocked) return { disposition: "ESCALATED", hypothesisKeys: [], reasonCodes: ["SAFETY_STOP_WORK", "CONCLUSION_ESCALATION_REQUIRED"], explanation: ["Unsafe reproduction or testing prevents a technical conclusion."] };
  if (!input.sourceAvailable) return { disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: ["SOURCE_UNAVAILABLE", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["The governed source package is unavailable."] };
  if (!input.computationComplete) return { disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: ["REASONING_BOUNDED_SEARCH_INCOMPLETE", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["The bounded search did not complete."] };
  if (!input.concernReproduced && !input.signals.some((signal) => signal.relationship === "DIRECT_SUPPORT" || signal.relationship === "CAUSAL_SUPPORT")) return { disposition: "NO_FAULT_FOUND", hypothesisKeys: [], reasonCodes: ["CONCERN_NOT_REPRODUCED", "NO_QUALIFIED_FAULT_EVIDENCE"], explanation: ["No qualified fault evidence was observed in the stated conditions."] };
  const groups = new Map<string, Set<string>>(); const scores = new Map<string, number>(); const contradicted = new Set<string>();
  for (const signal of input.signals) {
    const hypothesis = canonical(signal.hypothesisKey); const relationship = signal.relationship;
    if (relationship === "CONTRADICTION") { contradicted.add(hypothesis); continue; }
    const weight = relationship === "DIRECT_SUPPORT" ? 3 : relationship === "CAUSAL_SUPPORT" ? 2 : 0.25;
    scores.set(hypothesis, (scores.get(hypothesis) ?? 0) + weight); const set = groups.get(hypothesis) ?? new Set<string>(); set.add(canonical(signal.independenceGroup)); groups.set(hypothesis, set);
  }
  const qualified = [...scores.entries()].filter(([hypothesis, score]) => !contradicted.has(hypothesis) && score >= 2 && (groups.get(hypothesis)?.size ?? 0) >= 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!qualified.length) return { disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: [contradicted.size ? "DATA_CONFLICTING" : "CONCLUSION_EVIDENCE_INSUFFICIENT", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["No candidate has contradiction-free causal support."] };
  const maximum = qualified[0][1]; const selected = qualified.filter(([, score]) => score === maximum).map(([hypothesis]) => hypothesis);
  return { disposition: "CONFIRMED", hypothesisKeys: unique(selected), reasonCodes: [selected.length > 1 ? "CONCLUSION_MULTIPLE_CAUSES_SUPPORTED" : "CONCLUSION_CAUSAL_SUPPORT"], explanation: ["Qualified causal evidence supports the selected cause set; association-only signals did not control the result."] };
}

const signal = (hypothesisKey: string, relationship: NoStartProofSignal["relationship"], independenceGroup: string, factKey = `${hypothesisKey}_${relationship}`): NoStartProofSignal => ({ factKey, hypothesisKey, relationship, independenceGroup });
export const NO_START_PROOF_CORPUS: readonly NoStartProofScenario[] = Object.freeze([
  { id: "NS-NORMAL-001", family: "NORMAL", trainingOnly: true, input: { safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: true, signals: [signal("BATTERY_CAPACITY", "DIRECT_SUPPORT", "LOAD_TEST")] }, expected: { disposition: "CONFIRMED", hypothesisKeys: ["BATTERY_CAPACITY"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "NS-MISLEADING-DTC-001", family: "MISLEADING_CODE", trainingOnly: true, input: { safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: true, signals: [signal("STARTER_INTERNAL", "ASSOCIATION", "DTC_HISTORY"), signal("STARTER_INTERNAL", "CONTRADICTION", "CURRENT_RAMP"), signal("GROUND_PATH", "DIRECT_SUPPORT", "LOADED_DROP")] }, expected: { disposition: "CONFIRMED", hypothesisKeys: ["GROUND_PATH"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "NS-MEASUREMENT-ERROR-001", family: "MEASUREMENT_ERROR", trainingOnly: true, input: { safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: true, signals: [signal("GROUND_PATH", "DIRECT_SUPPORT", "METER_A"), signal("GROUND_PATH", "CONTRADICTION", "METER_B")] }, expected: { disposition: "ABSTAINED", hypothesisKeys: [], requiredReasonCodes: ["DATA_CONFLICTING"] } },
  { id: "NS-COMMON-GROUND-001", family: "COMMON_GROUND", trainingOnly: true, input: { safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: true, signals: [signal("SHARED_POWER_GROUND", "CAUSAL_SUPPORT", "MODULE_TOPOLOGY"), signal("SHARED_POWER_GROUND", "DIRECT_SUPPORT", "LOADED_DROP")] }, expected: { disposition: "CONFIRMED", hypothesisKeys: ["SHARED_POWER_GROUND"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "NS-INTERMITTENT-001", family: "INTERMITTENT", trainingOnly: true, input: { safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: true, signals: [signal("INTERMITTENT_CONNECTION", "CAUSAL_SUPPORT", "HOT_SOAK"), signal("INTERMITTENT_CONNECTION", "DIRECT_SUPPORT", "TRIGGER_CAPTURE")] }, expected: { disposition: "CONFIRMED", hypothesisKeys: ["INTERMITTENT_CONNECTION"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "NS-MULTIPLE-FAULT-001", family: "MULTIPLE_FAULT", trainingOnly: true, input: { safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: true, signals: [signal("BATTERY_CAPACITY", "DIRECT_SUPPORT", "LOAD_TEST"), signal("GROUND_PATH", "DIRECT_SUPPORT", "LOADED_DROP")] }, expected: { disposition: "CONFIRMED", hypothesisKeys: ["BATTERY_CAPACITY", "GROUND_PATH"], requiredReasonCodes: ["CONCLUSION_MULTIPLE_CAUSES_SUPPORTED"] } },
  { id: "NS-UNSAFE-001", family: "UNSAFE", trainingOnly: true, input: { safetyBlocked: true, sourceAvailable: true, computationComplete: true, concernReproduced: true, signals: [] }, expected: { disposition: "ESCALATED", hypothesisKeys: [], requiredReasonCodes: ["SAFETY_STOP_WORK"] } },
  { id: "NS-DEGRADED-001", family: "DEGRADED", trainingOnly: true, input: { safetyBlocked: false, sourceAvailable: false, computationComplete: false, concernReproduced: true, signals: [] }, expected: { disposition: "ABSTAINED", hypothesisKeys: [], requiredReasonCodes: ["SOURCE_UNAVAILABLE"] } },
  { id: "NS-NFF-001", family: "NO_FAULT_FOUND", trainingOnly: true, input: { safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: false, signals: [signal("STARTER_INTERNAL", "ASSOCIATION", "HISTORY")] }, expected: { disposition: "NO_FAULT_FOUND", hypothesisKeys: [], requiredReasonCodes: ["CONCERN_NOT_REPRODUCED"] } }
]);

export function runNoStartProofCorpus(corpus: readonly NoStartProofScenario[] = NO_START_PROOF_CORPUS, evaluator: (input: NoStartProofScenario["input"]) => NoStartProofEngineResult = evaluateNoStartProofScenario) {
  const scenarioIds = new Set<string>(); const results = corpus.map((scenario) => {
    if (!scenario.trainingOnly) throw new Error(`Proof scenario ${scenario.id} is not isolated from live case execution.`); if (scenarioIds.has(scenario.id)) throw new Error(`Proof scenario ID ${scenario.id} is duplicated.`); scenarioIds.add(scenario.id);
    const result = evaluator(structuredClone(scenario.input)); const passed = result.disposition === scenario.expected.disposition && JSON.stringify(unique(result.hypothesisKeys)) === JSON.stringify(unique(scenario.expected.hypothesisKeys)) && scenario.expected.requiredReasonCodes.every((code) => result.reasonCodes.includes(code));
    return { scenarioId: scenario.id, family: scenario.family, passed, result, expectedChecksum: hashEnterpriseCommand(scenario.expected), resultChecksum: hashEnterpriseCommand(result) };
  });
  const familyCoverage = unique(corpus.map((scenario) => scenario.family)); const passed = results.every((result) => result.passed) && familyCoverage.length === 9;
  return { corpusVersion: NO_START_PROOF_CORPUS_VERSION, simulationOnly: true, blindedEvaluation: true, scenarioCount: results.length, familyCoverage, passed, results, corpusChecksum: hashEnterpriseCommand(corpus), runChecksum: hashEnterpriseCommand(results) };
}
