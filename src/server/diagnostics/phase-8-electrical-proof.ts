import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const PHASE_8_ELECTRICAL_PROOF_CORPUS_VERSION = "PHASE-8/ELECTRICAL-WAVEFORM-INTERMITTENT-PROOF/1.0.0";

export type Phase8ElectricalProofFamily = "ELECTRICAL_CIRCUIT" | "WAVEFORM_ANALYSIS" | "INTERMITTENT_FAULT";
export type Phase8ElectricalProofDisposition = "CONFIRMED" | "ABSTAINED" | "ESCALATED" | "NO_FAULT_FOUND";
export type Phase8ElectricalProofSignal = { factKey: string; hypothesisKey: string; relationship: "DIRECT_SUPPORT" | "CAUSAL_SUPPORT" | "ASSOCIATION" | "CONTRADICTION"; independenceGroup: string };
export type Phase8ElectricalProofScenario = {
  id: string; family: Phase8ElectricalProofFamily; scenarioClass: "NORMAL" | "MEASUREMENT" | "MISLEADING_CODE" | "UNSAFE" | "DEGRADED" | "NO_FAULT_FOUND"; trainingOnly: true;
  input: { family: Phase8ElectricalProofFamily; safetyBlocked: boolean; sourceAvailable: boolean; computationComplete: boolean; concernReproduced: boolean; excludedAuthorityTriggered: boolean; signals: Phase8ElectricalProofSignal[] };
  expected: { disposition: Phase8ElectricalProofDisposition; hypothesisKeys: string[]; requiredReasonCodes: string[] };
};
export type Phase8ElectricalProofEngineResult = { family: Phase8ElectricalProofFamily; disposition: Phase8ElectricalProofDisposition; hypothesisKeys: string[]; reasonCodes: string[]; explanation: string[] };

const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical))].sort((left, right) => left.localeCompare(right));
const allowedHypotheses: Record<Phase8ElectricalProofFamily, string[]> = {
  ELECTRICAL_CIRCUIT: ["OPEN_CIRCUIT", "SHORT_TO_POWER_OR_GROUND", "VOLTAGE_DROP_FAULT", "CONTROL_COMMAND_OR_SCAN_MISLEAD"],
  WAVEFORM_ANALYSIS: ["SIGNAL_INTEGRITY_FAULT", "TIMING_CORRELATION_FAULT", "PATTERN_DEVIATION", "WAVEFORM_REFERENCE_MISLEAD"],
  INTERMITTENT_FAULT: ["CONNECTOR_OR_HARNESS_INTERMITTENT", "THERMAL_OR_VIBRATION_INTERMITTENT", "CONTROL_STATE_INTERMITTENT", "NFF_OR_HISTORY_MISLEAD"]
};
const safetyReason: Record<Phase8ElectricalProofFamily, string> = { ELECTRICAL_CIRCUIT: "ELECTRICAL_ENERGY_OR_PYROTECHNIC_STOP", WAVEFORM_ANALYSIS: "WAVEFORM_PROBING_OR_ROTATING_COMPONENT_STOP", INTERMITTENT_FAULT: "INTERMITTENT_ROAD_TEST_OR_DAMAGE_RISK_STOP" };
const excludedReason: Record<Phase8ElectricalProofFamily, string> = { ELECTRICAL_CIRCUIT: "ELECTRICAL_EXCLUDED_AUTHORITY_ESCALATION", WAVEFORM_ANALYSIS: "WAVEFORM_EXCLUDED_AUTHORITY_ESCALATION", INTERMITTENT_FAULT: "INTERMITTENT_EXCLUDED_AUTHORITY_ESCALATION" };

export function evaluatePhase8ElectricalProofScenario(input: Phase8ElectricalProofScenario["input"]): Phase8ElectricalProofEngineResult {
  if (input.safetyBlocked) return { family: input.family, disposition: "ESCALATED", hypothesisKeys: [], reasonCodes: [safetyReason[input.family], "CONCLUSION_ESCALATION_REQUIRED"], explanation: ["Safety-critical conditions block a technical conclusion for this Phase 8 family."] };
  if (input.excludedAuthorityTriggered) return { family: input.family, disposition: "ESCALATED", hypothesisKeys: [], reasonCodes: [excludedReason[input.family], "CONCLUSION_ESCALATION_REQUIRED"], explanation: ["The requested action is outside the Phase 8 shadow authority boundary."] };
  if (!input.sourceAvailable) return { family: input.family, disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: ["SOURCE_UNAVAILABLE", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["The governed Phase 8 source package is unavailable."] };
  if (!input.computationComplete) return { family: input.family, disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: ["REASONING_BOUNDED_SEARCH_INCOMPLETE", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["The bounded Phase 8 evaluation did not complete."] };
  if (!input.concernReproduced && !input.signals.some((signal) => signal.relationship === "DIRECT_SUPPORT" || signal.relationship === "CAUSAL_SUPPORT")) return { family: input.family, disposition: "NO_FAULT_FOUND", hypothesisKeys: [], reasonCodes: ["CONCERN_NOT_REPRODUCED", "NO_QUALIFIED_FAULT_EVIDENCE"], explanation: ["No qualified Phase 8 evidence was observed in the stated conditions."] };
  const allowed = new Set(allowedHypotheses[input.family]);
  const groups = new Map<string, Set<string>>();
  const scores = new Map<string, number>();
  const contradicted = new Set<string>();
  for (const signal of input.signals) {
    const hypothesis = canonical(signal.hypothesisKey);
    if (!allowed.has(hypothesis)) continue;
    if (signal.relationship === "CONTRADICTION") { contradicted.add(hypothesis); continue; }
    const weight = signal.relationship === "DIRECT_SUPPORT" ? 3 : signal.relationship === "CAUSAL_SUPPORT" ? 2 : 0.25;
    scores.set(hypothesis, (scores.get(hypothesis) ?? 0) + weight);
    const set = groups.get(hypothesis) ?? new Set<string>(); set.add(canonical(signal.independenceGroup)); groups.set(hypothesis, set);
  }
  const qualified = [...scores.entries()].filter(([hypothesis, score]) => !contradicted.has(hypothesis) && score >= 2 && (groups.get(hypothesis)?.size ?? 0) >= 1).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (!qualified.length) return { family: input.family, disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: [contradicted.size ? "DATA_CONFLICTING" : "CONCLUSION_EVIDENCE_INSUFFICIENT", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["No Phase 8 candidate has contradiction-free causal support."] };
  const maximum = qualified[0][1];
  const selected = qualified.filter(([, score]) => score === maximum).map(([hypothesis]) => hypothesis);
  return { family: input.family, disposition: "CONFIRMED", hypothesisKeys: unique(selected), reasonCodes: [selected.length > 1 ? "CONCLUSION_MULTIPLE_CAUSES_SUPPORTED" : "CONCLUSION_CAUSAL_SUPPORT"], explanation: ["Qualified Phase 8 evidence supports the selected cause set; association-only signals did not control the result."] };
}

const signal = (hypothesisKey: string, relationship: Phase8ElectricalProofSignal["relationship"], independenceGroup: string, factKey = `${hypothesisKey}_${relationship}`): Phase8ElectricalProofSignal => ({ factKey, hypothesisKey, relationship, independenceGroup });
const input = (family: Phase8ElectricalProofFamily, values: Partial<Phase8ElectricalProofScenario["input"]>): Phase8ElectricalProofScenario["input"] => ({ family, safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: true, excludedAuthorityTriggered: false, signals: [], ...values });

export const PHASE_8_ELECTRICAL_PROOF_CORPUS: readonly Phase8ElectricalProofScenario[] = Object.freeze([
  { id: "ELEC-NORMAL-001", family: "ELECTRICAL_CIRCUIT", scenarioClass: "NORMAL", trainingOnly: true, input: input("ELECTRICAL_CIRCUIT", { signals: [signal("VOLTAGE_DROP_FAULT", "DIRECT_SUPPORT", "LOAD_DROP"), signal("VOLTAGE_DROP_FAULT", "CAUSAL_SUPPORT", "SYMPTOM_UNDER_LOAD")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["VOLTAGE_DROP_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "ELEC-MEASUREMENT-001", family: "ELECTRICAL_CIRCUIT", scenarioClass: "MEASUREMENT", trainingOnly: true, input: input("ELECTRICAL_CIRCUIT", { signals: [signal("OPEN_CIRCUIT", "DIRECT_SUPPORT", "CONTINUITY_CHECK"), signal("OPEN_CIRCUIT", "CAUSAL_SUPPORT", "NO_LOAD_RESPONSE")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["OPEN_CIRCUIT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "ELEC-MISLEADING-CODE-001", family: "ELECTRICAL_CIRCUIT", scenarioClass: "MISLEADING_CODE", trainingOnly: true, input: input("ELECTRICAL_CIRCUIT", { signals: [signal("CONTROL_COMMAND_OR_SCAN_MISLEAD", "ASSOCIATION", "DTC_HISTORY"), signal("CONTROL_COMMAND_OR_SCAN_MISLEAD", "CONTRADICTION", "LOAD_MEASUREMENT"), signal("SHORT_TO_POWER_OR_GROUND", "DIRECT_SUPPORT", "FUSED_LOAD_TEST")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["SHORT_TO_POWER_OR_GROUND"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "ELEC-UNSAFE-001", family: "ELECTRICAL_CIRCUIT", scenarioClass: "UNSAFE", trainingOnly: true, input: input("ELECTRICAL_CIRCUIT", { safetyBlocked: true }), expected: { disposition: "ESCALATED", hypothesisKeys: [], requiredReasonCodes: ["ELECTRICAL_ENERGY_OR_PYROTECHNIC_STOP"] } },
  { id: "ELEC-NFF-001", family: "ELECTRICAL_CIRCUIT", scenarioClass: "NO_FAULT_FOUND", trainingOnly: true, input: input("ELECTRICAL_CIRCUIT", { concernReproduced: false, signals: [signal("CONTROL_COMMAND_OR_SCAN_MISLEAD", "ASSOCIATION", "HISTORY")] }), expected: { disposition: "NO_FAULT_FOUND", hypothesisKeys: [], requiredReasonCodes: ["CONCERN_NOT_REPRODUCED"] } },
  { id: "WAVE-NORMAL-001", family: "WAVEFORM_ANALYSIS", scenarioClass: "NORMAL", trainingOnly: true, input: input("WAVEFORM_ANALYSIS", { signals: [signal("SIGNAL_INTEGRITY_FAULT", "DIRECT_SUPPORT", "SCOPE_CAPTURE"), signal("SIGNAL_INTEGRITY_FAULT", "CAUSAL_SUPPORT", "NOISE_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["SIGNAL_INTEGRITY_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "WAVE-MEASUREMENT-001", family: "WAVEFORM_ANALYSIS", scenarioClass: "MEASUREMENT", trainingOnly: true, input: input("WAVEFORM_ANALYSIS", { signals: [signal("TIMING_CORRELATION_FAULT", "DIRECT_SUPPORT", "SYNC_CAPTURE"), signal("TIMING_CORRELATION_FAULT", "CAUSAL_SUPPORT", "PHASE_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["TIMING_CORRELATION_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "WAVE-MISLEADING-CODE-001", family: "WAVEFORM_ANALYSIS", scenarioClass: "MISLEADING_CODE", trainingOnly: true, input: input("WAVEFORM_ANALYSIS", { signals: [signal("WAVEFORM_REFERENCE_MISLEAD", "ASSOCIATION", "UNAUTHORIZED_REFERENCE"), signal("WAVEFORM_REFERENCE_MISLEAD", "CONTRADICTION", "SETUP_REVIEW"), signal("PATTERN_DEVIATION", "DIRECT_SUPPORT", "TRANSDUCER_CAPTURE")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["PATTERN_DEVIATION"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "WAVE-UNSAFE-001", family: "WAVEFORM_ANALYSIS", scenarioClass: "UNSAFE", trainingOnly: true, input: input("WAVEFORM_ANALYSIS", { excludedAuthorityTriggered: true }), expected: { disposition: "ESCALATED", hypothesisKeys: [], requiredReasonCodes: ["WAVEFORM_EXCLUDED_AUTHORITY_ESCALATION"] } },
  { id: "WAVE-DEGRADED-001", family: "WAVEFORM_ANALYSIS", scenarioClass: "DEGRADED", trainingOnly: true, input: input("WAVEFORM_ANALYSIS", { sourceAvailable: false }), expected: { disposition: "ABSTAINED", hypothesisKeys: [], requiredReasonCodes: ["SOURCE_UNAVAILABLE"] } },
  { id: "INT-NORMAL-001", family: "INTERMITTENT_FAULT", scenarioClass: "NORMAL", trainingOnly: true, input: input("INTERMITTENT_FAULT", { signals: [signal("THERMAL_OR_VIBRATION_INTERMITTENT", "DIRECT_SUPPORT", "TRIGGER_CAPTURE"), signal("THERMAL_OR_VIBRATION_INTERMITTENT", "CAUSAL_SUPPORT", "TEMP_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["THERMAL_OR_VIBRATION_INTERMITTENT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "INT-MEASUREMENT-001", family: "INTERMITTENT_FAULT", scenarioClass: "MEASUREMENT", trainingOnly: true, input: input("INTERMITTENT_FAULT", { signals: [signal("CONNECTOR_OR_HARNESS_INTERMITTENT", "DIRECT_SUPPORT", "CONTROLLED_WIGGLE"), signal("CONNECTOR_OR_HARNESS_INTERMITTENT", "CAUSAL_SUPPORT", "RECOVERY_CAPTURE")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["CONNECTOR_OR_HARNESS_INTERMITTENT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "INT-MISLEADING-CODE-001", family: "INTERMITTENT_FAULT", scenarioClass: "MISLEADING_CODE", trainingOnly: true, input: input("INTERMITTENT_FAULT", { signals: [signal("NFF_OR_HISTORY_MISLEAD", "ASSOCIATION", "HISTORY"), signal("NFF_OR_HISTORY_MISLEAD", "CONTRADICTION", "EVENT_CAPTURE"), signal("CONTROL_STATE_INTERMITTENT", "DIRECT_SUPPORT", "DATA_LOGGER")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["CONTROL_STATE_INTERMITTENT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "INT-UNSAFE-001", family: "INTERMITTENT_FAULT", scenarioClass: "UNSAFE", trainingOnly: true, input: input("INTERMITTENT_FAULT", { safetyBlocked: true }), expected: { disposition: "ESCALATED", hypothesisKeys: [], requiredReasonCodes: ["INTERMITTENT_ROAD_TEST_OR_DAMAGE_RISK_STOP"] } },
  { id: "INT-NFF-001", family: "INTERMITTENT_FAULT", scenarioClass: "NO_FAULT_FOUND", trainingOnly: true, input: input("INTERMITTENT_FAULT", { concernReproduced: false, signals: [signal("NFF_OR_HISTORY_MISLEAD", "ASSOCIATION", "HISTORY")] }), expected: { disposition: "NO_FAULT_FOUND", hypothesisKeys: [], requiredReasonCodes: ["CONCERN_NOT_REPRODUCED"] } }
]);

export function runPhase8ElectricalProofCorpus(corpus: readonly Phase8ElectricalProofScenario[] = PHASE_8_ELECTRICAL_PROOF_CORPUS, evaluator: (input: Phase8ElectricalProofScenario["input"]) => Phase8ElectricalProofEngineResult = evaluatePhase8ElectricalProofScenario) {
  const scenarioIds = new Set<string>();
  const results = corpus.map((scenario) => {
    if (!scenario.trainingOnly) throw new Error(`Phase 8 proof scenario ${scenario.id} is not isolated from live case execution.`);
    if (scenarioIds.has(scenario.id)) throw new Error(`Phase 8 proof scenario ID ${scenario.id} is duplicated.`);
    scenarioIds.add(scenario.id);
    const result = evaluator(structuredClone(scenario.input));
    const passed = result.disposition === scenario.expected.disposition && JSON.stringify(unique(result.hypothesisKeys)) === JSON.stringify(unique(scenario.expected.hypothesisKeys)) && scenario.expected.requiredReasonCodes.every((code) => result.reasonCodes.includes(code));
    return { scenarioId: scenario.id, family: scenario.family, scenarioClass: scenario.scenarioClass, passed, result, expectedChecksum: hashEnterpriseCommand(scenario.expected), resultChecksum: hashEnterpriseCommand(result) };
  });
  const familyCoverage = unique(corpus.map((scenario) => scenario.family));
  const scenarioClassCoverage = unique(corpus.map((scenario) => scenario.scenarioClass));
  const passed = results.every((result) => result.passed) && familyCoverage.length === 3 && scenarioClassCoverage.length === 6;
  return { corpusVersion: PHASE_8_ELECTRICAL_PROOF_CORPUS_VERSION, simulationOnly: true, blindedEvaluation: true, scenarioCount: results.length, familyCoverage, scenarioClassCoverage, passed, results, corpusChecksum: hashEnterpriseCommand(corpus), runChecksum: hashEnterpriseCommand(results) };
}
