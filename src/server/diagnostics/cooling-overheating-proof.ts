import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const COOLING_OVERHEATING_PROOF_CORPUS_VERSION = "DGN-058/COOLING-OVERHEATING-CORPUS/1.0.0";

export type CoolingOverheatingProofDisposition = "CONFIRMED" | "ABSTAINED" | "ESCALATED" | "NO_FAULT_FOUND";
export type CoolingOverheatingProofFamily = "NORMAL" | "COOLANT_LEAK" | "FLOW_RESTRICTION" | "FAN_CONTROL" | "COMBUSTION_GAS" | "MISLEADING_CODE" | "UNSAFE" | "DEGRADED" | "NO_FAULT_FOUND";
export type CoolingOverheatingProofSignal = {
  factKey: string;
  hypothesisKey: "COOLANT_LEAK" | "FLOW_RESTRICTION" | "AIRFLOW_DEFICIT" | "PRESSURE_CAP_FAULT" | "COMBUSTION_GAS_INTRUSION" | "SENSOR_OR_SCAN_MISLEAD";
  relationship: "DIRECT_SUPPORT" | "CAUSAL_SUPPORT" | "ASSOCIATION" | "CONTRADICTION";
  independenceGroup: string;
};

export type CoolingOverheatingProofScenario = {
  id: string;
  family: CoolingOverheatingProofFamily;
  trainingOnly: true;
  input: {
    safetyBlocked: boolean;
    sourceAvailable: boolean;
    computationComplete: boolean;
    concernReproduced: boolean;
    highVoltageThermalSystem: boolean;
    signals: CoolingOverheatingProofSignal[];
  };
  expected: {
    disposition: CoolingOverheatingProofDisposition;
    hypothesisKeys: string[];
    requiredReasonCodes: string[];
  };
};

export type CoolingOverheatingProofEngineResult = {
  disposition: CoolingOverheatingProofDisposition;
  hypothesisKeys: string[];
  reasonCodes: string[];
  explanation: string[];
};

const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical))].sort((left, right) => left.localeCompare(right));

export function evaluateCoolingOverheatingProofScenario(input: CoolingOverheatingProofScenario["input"]): CoolingOverheatingProofEngineResult {
  if (input.safetyBlocked) return { disposition: "ESCALATED", hypothesisKeys: [], reasonCodes: ["SAFETY_HOT_PRESSURIZED_SYSTEM_STOP", "CONCLUSION_ESCALATION_REQUIRED"], explanation: ["Unsafe hot, pressurized, or moving-component conditions prevent a technical conclusion."] };
  if (input.highVoltageThermalSystem) return { disposition: "ESCALATED", hypothesisKeys: [], reasonCodes: ["DG_G7_HIGH_VOLTAGE_THERMAL_ESCALATION_REQUIRED", "CONCLUSION_ESCALATION_REQUIRED"], explanation: ["High-voltage thermal management is outside this cooling foundation and requires enhanced controls."] };
  if (!input.sourceAvailable) return { disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: ["SOURCE_UNAVAILABLE", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["The governed cooling source package is unavailable."] };
  if (!input.computationComplete) return { disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: ["REASONING_BOUNDED_SEARCH_INCOMPLETE", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["The bounded cooling scenario evaluation did not complete."] };
  if (!input.concernReproduced && !input.signals.some((signal) => signal.relationship === "DIRECT_SUPPORT" || signal.relationship === "CAUSAL_SUPPORT")) return { disposition: "NO_FAULT_FOUND", hypothesisKeys: [], reasonCodes: ["CONCERN_NOT_REPRODUCED", "NO_QUALIFIED_FAULT_EVIDENCE"], explanation: ["No qualified overheating or coolant-loss evidence was observed in the stated conditions."] };

  const groups = new Map<string, Set<string>>();
  const scores = new Map<string, number>();
  const contradicted = new Set<string>();
  for (const signal of input.signals) {
    const hypothesis = canonical(signal.hypothesisKey);
    if (signal.relationship === "CONTRADICTION") {
      contradicted.add(hypothesis);
      continue;
    }
    const weight = signal.relationship === "DIRECT_SUPPORT" ? 3 : signal.relationship === "CAUSAL_SUPPORT" ? 2 : 0.25;
    scores.set(hypothesis, (scores.get(hypothesis) ?? 0) + weight);
    const set = groups.get(hypothesis) ?? new Set<string>();
    set.add(canonical(signal.independenceGroup));
    groups.set(hypothesis, set);
  }
  const qualified = [...scores.entries()]
    .filter(([hypothesis, score]) => !contradicted.has(hypothesis) && score >= 2 && (groups.get(hypothesis)?.size ?? 0) >= 1)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (!qualified.length) return { disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: [contradicted.size ? "DATA_CONFLICTING" : "CONCLUSION_EVIDENCE_INSUFFICIENT", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["No cooling candidate has contradiction-free causal support."] };
  const maximum = qualified[0][1];
  const selected = qualified.filter(([, score]) => score === maximum).map(([hypothesis]) => hypothesis);
  return { disposition: "CONFIRMED", hypothesisKeys: unique(selected), reasonCodes: [selected.length > 1 ? "CONCLUSION_MULTIPLE_CAUSES_SUPPORTED" : "CONCLUSION_CAUSAL_SUPPORT"], explanation: ["Qualified cooling evidence supports the selected cause set; association-only signals did not control the result."] };
}

const signal = (hypothesisKey: CoolingOverheatingProofSignal["hypothesisKey"], relationship: CoolingOverheatingProofSignal["relationship"], independenceGroup: string, factKey = `${hypothesisKey}_${relationship}`): CoolingOverheatingProofSignal => ({ factKey, hypothesisKey, relationship, independenceGroup });
const input = (values: Partial<CoolingOverheatingProofScenario["input"]>): CoolingOverheatingProofScenario["input"] => ({
  safetyBlocked: false,
  sourceAvailable: true,
  computationComplete: true,
  concernReproduced: true,
  highVoltageThermalSystem: false,
  signals: [],
  ...values
});

export const COOLING_OVERHEATING_PROOF_CORPUS: readonly CoolingOverheatingProofScenario[] = Object.freeze([
  { id: "COOL-NORMAL-001", family: "NORMAL", trainingOnly: true, input: input({ signals: [signal("PRESSURE_CAP_FAULT", "DIRECT_SUPPORT", "PRESSURE_TEST"), signal("PRESSURE_CAP_FAULT", "CAUSAL_SUPPORT", "BOILOVER_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["PRESSURE_CAP_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "COOL-LEAK-001", family: "COOLANT_LEAK", trainingOnly: true, input: input({ signals: [signal("COOLANT_LEAK", "DIRECT_SUPPORT", "PRESSURE_DECAY"), signal("COOLANT_LEAK", "CAUSAL_SUPPORT", "VISIBLE_DYE")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["COOLANT_LEAK"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "COOL-FLOW-001", family: "FLOW_RESTRICTION", trainingOnly: true, input: input({ signals: [signal("FLOW_RESTRICTION", "DIRECT_SUPPORT", "THERMAL_PROFILE"), signal("FLOW_RESTRICTION", "CAUSAL_SUPPORT", "HEATER_OUTPUT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["FLOW_RESTRICTION"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "COOL-FAN-001", family: "FAN_CONTROL", trainingOnly: true, input: input({ signals: [signal("AIRFLOW_DEFICIT", "DIRECT_SUPPORT", "FAN_COMMAND_RESPONSE"), signal("AIRFLOW_DEFICIT", "CAUSAL_SUPPORT", "IDLE_OVERHEAT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["AIRFLOW_DEFICIT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "COOL-COMBUSTION-001", family: "COMBUSTION_GAS", trainingOnly: true, input: input({ signals: [signal("COMBUSTION_GAS_INTRUSION", "DIRECT_SUPPORT", "GAS_SCREEN"), signal("COMBUSTION_GAS_INTRUSION", "CAUSAL_SUPPORT", "PRESSURE_RISE")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["COMBUSTION_GAS_INTRUSION"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "COOL-MISLEADING-CODE-001", family: "MISLEADING_CODE", trainingOnly: true, input: input({ signals: [signal("SENSOR_OR_SCAN_MISLEAD", "ASSOCIATION", "DTC_HISTORY"), signal("SENSOR_OR_SCAN_MISLEAD", "CONTRADICTION", "THERMAL_PROFILE"), signal("FLOW_RESTRICTION", "DIRECT_SUPPORT", "THERMAL_PROFILE")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["FLOW_RESTRICTION"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "COOL-UNSAFE-001", family: "UNSAFE", trainingOnly: true, input: input({ safetyBlocked: true }), expected: { disposition: "ESCALATED", hypothesisKeys: [], requiredReasonCodes: ["SAFETY_HOT_PRESSURIZED_SYSTEM_STOP"] } },
  { id: "COOL-DEGRADED-001", family: "DEGRADED", trainingOnly: true, input: input({ sourceAvailable: false, computationComplete: false }), expected: { disposition: "ABSTAINED", hypothesisKeys: [], requiredReasonCodes: ["SOURCE_UNAVAILABLE"] } },
  { id: "COOL-NFF-001", family: "NO_FAULT_FOUND", trainingOnly: true, input: input({ concernReproduced: false, signals: [signal("SENSOR_OR_SCAN_MISLEAD", "ASSOCIATION", "HISTORY")] }), expected: { disposition: "NO_FAULT_FOUND", hypothesisKeys: [], requiredReasonCodes: ["CONCERN_NOT_REPRODUCED"] } }
]);

export function runCoolingOverheatingProofCorpus(corpus: readonly CoolingOverheatingProofScenario[] = COOLING_OVERHEATING_PROOF_CORPUS, evaluator: (input: CoolingOverheatingProofScenario["input"]) => CoolingOverheatingProofEngineResult = evaluateCoolingOverheatingProofScenario) {
  const scenarioIds = new Set<string>();
  const results = corpus.map((scenario) => {
    if (!scenario.trainingOnly) throw new Error(`Cooling proof scenario ${scenario.id} is not isolated from live case execution.`);
    if (scenarioIds.has(scenario.id)) throw new Error(`Cooling proof scenario ID ${scenario.id} is duplicated.`);
    scenarioIds.add(scenario.id);
    const result = evaluator(structuredClone(scenario.input));
    const passed = result.disposition === scenario.expected.disposition && JSON.stringify(unique(result.hypothesisKeys)) === JSON.stringify(unique(scenario.expected.hypothesisKeys)) && scenario.expected.requiredReasonCodes.every((code) => result.reasonCodes.includes(code));
    return { scenarioId: scenario.id, family: scenario.family, passed, result, expectedChecksum: hashEnterpriseCommand(scenario.expected), resultChecksum: hashEnterpriseCommand(result) };
  });
  const familyCoverage = unique(corpus.map((scenario) => scenario.family));
  const passed = results.every((result) => result.passed) && familyCoverage.length === 9;
  return { corpusVersion: COOLING_OVERHEATING_PROOF_CORPUS_VERSION, simulationOnly: true, blindedEvaluation: true, scenarioCount: results.length, familyCoverage, passed, results, corpusChecksum: hashEnterpriseCommand(corpus), runChecksum: hashEnterpriseCommand(results) };
}
