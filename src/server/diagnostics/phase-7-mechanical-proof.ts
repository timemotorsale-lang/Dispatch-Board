import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const PHASE_7_MECHANICAL_PROOF_CORPUS_VERSION = "PHASE-7/BRAKE-HVAC-MISFIRE-PROOF/1.0.0";

export type Phase7MechanicalProofFamily = "BRAKE" | "HVAC" | "MISFIRE_DRIVABILITY";
export type Phase7MechanicalProofDisposition = "CONFIRMED" | "ABSTAINED" | "ESCALATED" | "NO_FAULT_FOUND";
export type Phase7MechanicalProofSignal = { factKey: string; hypothesisKey: string; relationship: "DIRECT_SUPPORT" | "CAUSAL_SUPPORT" | "ASSOCIATION" | "CONTRADICTION"; independenceGroup: string };
export type Phase7MechanicalProofScenario = {
  id: string; family: Phase7MechanicalProofFamily; scenarioClass: "NORMAL" | "MEASUREMENT" | "MISLEADING_CODE" | "UNSAFE" | "DEGRADED" | "NO_FAULT_FOUND"; trainingOnly: true;
  input: { family: Phase7MechanicalProofFamily; safetyBlocked: boolean; sourceAvailable: boolean; computationComplete: boolean; concernReproduced: boolean; excludedAuthorityTriggered: boolean; signals: Phase7MechanicalProofSignal[] };
  expected: { disposition: Phase7MechanicalProofDisposition; hypothesisKeys: string[]; requiredReasonCodes: string[] };
};
export type Phase7MechanicalProofEngineResult = { family: Phase7MechanicalProofFamily; disposition: Phase7MechanicalProofDisposition; hypothesisKeys: string[]; reasonCodes: string[]; explanation: string[] };

const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical))].sort((left, right) => left.localeCompare(right));
const allowedHypotheses: Record<Phase7MechanicalProofFamily, string[]> = {
  BRAKE: ["FRICTION_HARDWARE_FAULT", "ROTOR_RUNOUT_VARIATION", "HYDRAULIC_PRESSURE_FAULT", "BRAKE_CONTROL_OR_SCAN_MISLEAD"],
  HVAC: ["REFRIGERANT_PERFORMANCE_FAULT", "AIRFLOW_RESTRICTION", "TEMPERATURE_DOOR_FAULT", "HEATER_PERFORMANCE_FAULT", "HVAC_CONTROL_OR_SCAN_MISLEAD"],
  MISFIRE_DRIVABILITY: ["IGNITION_FAULT", "FUEL_MIXTURE_FAULT", "AIR_METERING_FAULT", "MECHANICAL_FAULT", "MISFIRE_SCAN_OR_CODE_MISLEAD"]
};
const safetyReason: Record<Phase7MechanicalProofFamily, string> = { BRAKE: "BRAKE_SAFETY_CRITICAL_STOP", HVAC: "HVAC_REFRIGERANT_OR_MOVING_COMPONENT_STOP", MISFIRE_DRIVABILITY: "MISFIRE_FIRE_ROTATING_OR_ROAD_TEST_STOP" };
const excludedReason: Record<Phase7MechanicalProofFamily, string> = { BRAKE: "BRAKE_EXCLUDED_AUTHORITY_ESCALATION", HVAC: "HVAC_EXCLUDED_AUTHORITY_ESCALATION", MISFIRE_DRIVABILITY: "MISFIRE_EXCLUDED_AUTHORITY_ESCALATION" };

export function evaluatePhase7MechanicalProofScenario(input: Phase7MechanicalProofScenario["input"]): Phase7MechanicalProofEngineResult {
  if (input.safetyBlocked) return { family: input.family, disposition: "ESCALATED", hypothesisKeys: [], reasonCodes: [safetyReason[input.family], "CONCLUSION_ESCALATION_REQUIRED"], explanation: ["Safety-critical conditions block a technical conclusion for this family."] };
  if (input.excludedAuthorityTriggered) return { family: input.family, disposition: "ESCALATED", hypothesisKeys: [], reasonCodes: [excludedReason[input.family], "CONCLUSION_ESCALATION_REQUIRED"], explanation: ["The requested action is outside the Phase 7 shadow authority boundary."] };
  if (!input.sourceAvailable) return { family: input.family, disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: ["SOURCE_UNAVAILABLE", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["The governed Phase 7 source package is unavailable."] };
  if (!input.computationComplete) return { family: input.family, disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: ["REASONING_BOUNDED_SEARCH_INCOMPLETE", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["The bounded Phase 7 evaluation did not complete."] };
  if (!input.concernReproduced && !input.signals.some((signal) => signal.relationship === "DIRECT_SUPPORT" || signal.relationship === "CAUSAL_SUPPORT")) return { family: input.family, disposition: "NO_FAULT_FOUND", hypothesisKeys: [], reasonCodes: ["CONCERN_NOT_REPRODUCED", "NO_QUALIFIED_FAULT_EVIDENCE"], explanation: ["No qualified family evidence was observed in the stated conditions."] };
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
  if (!qualified.length) return { family: input.family, disposition: "ABSTAINED", hypothesisKeys: [], reasonCodes: [contradicted.size ? "DATA_CONFLICTING" : "CONCLUSION_EVIDENCE_INSUFFICIENT", "CONCLUSION_ABSTENTION_REQUIRED"], explanation: ["No Phase 7 candidate has contradiction-free causal support."] };
  const maximum = qualified[0][1];
  const selected = qualified.filter(([, score]) => score === maximum).map(([hypothesis]) => hypothesis);
  return { family: input.family, disposition: "CONFIRMED", hypothesisKeys: unique(selected), reasonCodes: [selected.length > 1 ? "CONCLUSION_MULTIPLE_CAUSES_SUPPORTED" : "CONCLUSION_CAUSAL_SUPPORT"], explanation: ["Qualified Phase 7 evidence supports the selected cause set; association-only signals did not control the result."] };
}

const signal = (hypothesisKey: string, relationship: Phase7MechanicalProofSignal["relationship"], independenceGroup: string, factKey = `${hypothesisKey}_${relationship}`): Phase7MechanicalProofSignal => ({ factKey, hypothesisKey, relationship, independenceGroup });
const input = (family: Phase7MechanicalProofFamily, values: Partial<Phase7MechanicalProofScenario["input"]>): Phase7MechanicalProofScenario["input"] => ({ family, safetyBlocked: false, sourceAvailable: true, computationComplete: true, concernReproduced: true, excludedAuthorityTriggered: false, signals: [], ...values });

export const PHASE_7_MECHANICAL_PROOF_CORPUS: readonly Phase7MechanicalProofScenario[] = Object.freeze([
  { id: "BRAKE-NORMAL-001", family: "BRAKE", scenarioClass: "NORMAL", trainingOnly: true, input: input("BRAKE", { signals: [signal("FRICTION_HARDWARE_FAULT", "DIRECT_SUPPORT", "FRICTION_INSPECTION"), signal("FRICTION_HARDWARE_FAULT", "CAUSAL_SUPPORT", "NOISE_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["FRICTION_HARDWARE_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "BRAKE-MEASUREMENT-001", family: "BRAKE", scenarioClass: "MEASUREMENT", trainingOnly: true, input: input("BRAKE", { signals: [signal("ROTOR_RUNOUT_VARIATION", "DIRECT_SUPPORT", "RUNOUT_MEASUREMENT"), signal("ROTOR_RUNOUT_VARIATION", "CAUSAL_SUPPORT", "PULSATION_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["ROTOR_RUNOUT_VARIATION"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "BRAKE-MISLEADING-CODE-001", family: "BRAKE", scenarioClass: "MISLEADING_CODE", trainingOnly: true, input: input("BRAKE", { signals: [signal("BRAKE_CONTROL_OR_SCAN_MISLEAD", "ASSOCIATION", "ABS_CODE"), signal("BRAKE_CONTROL_OR_SCAN_MISLEAD", "CONTRADICTION", "HYDRAULIC_TEST"), signal("HYDRAULIC_PRESSURE_FAULT", "DIRECT_SUPPORT", "HYDRAULIC_TEST")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["HYDRAULIC_PRESSURE_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "BRAKE-UNSAFE-001", family: "BRAKE", scenarioClass: "UNSAFE", trainingOnly: true, input: input("BRAKE", { safetyBlocked: true }), expected: { disposition: "ESCALATED", hypothesisKeys: [], requiredReasonCodes: ["BRAKE_SAFETY_CRITICAL_STOP"] } },
  { id: "BRAKE-NFF-001", family: "BRAKE", scenarioClass: "NO_FAULT_FOUND", trainingOnly: true, input: input("BRAKE", { concernReproduced: false, signals: [signal("BRAKE_CONTROL_OR_SCAN_MISLEAD", "ASSOCIATION", "HISTORY")] }), expected: { disposition: "NO_FAULT_FOUND", hypothesisKeys: [], requiredReasonCodes: ["CONCERN_NOT_REPRODUCED"] } },
  { id: "HVAC-NORMAL-001", family: "HVAC", scenarioClass: "NORMAL", trainingOnly: true, input: input("HVAC", { signals: [signal("REFRIGERANT_PERFORMANCE_FAULT", "DIRECT_SUPPORT", "TEMP_PRESSURE_PROFILE"), signal("REFRIGERANT_PERFORMANCE_FAULT", "CAUSAL_SUPPORT", "VENT_TEMP_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["REFRIGERANT_PERFORMANCE_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "HVAC-MEASUREMENT-001", family: "HVAC", scenarioClass: "MEASUREMENT", trainingOnly: true, input: input("HVAC", { signals: [signal("AIRFLOW_RESTRICTION", "DIRECT_SUPPORT", "AIRFLOW_MEASUREMENT"), signal("AIRFLOW_RESTRICTION", "CAUSAL_SUPPORT", "COMMAND_RESPONSE")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["AIRFLOW_RESTRICTION"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "HVAC-MISLEADING-CODE-001", family: "HVAC", scenarioClass: "MISLEADING_CODE", trainingOnly: true, input: input("HVAC", { signals: [signal("HVAC_CONTROL_OR_SCAN_MISLEAD", "ASSOCIATION", "DTC_HISTORY"), signal("HVAC_CONTROL_OR_SCAN_MISLEAD", "CONTRADICTION", "ACTUATOR_FEEDBACK"), signal("TEMPERATURE_DOOR_FAULT", "DIRECT_SUPPORT", "COMMAND_RESPONSE")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["TEMPERATURE_DOOR_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "HVAC-UNSAFE-001", family: "HVAC", scenarioClass: "UNSAFE", trainingOnly: true, input: input("HVAC", { excludedAuthorityTriggered: true }), expected: { disposition: "ESCALATED", hypothesisKeys: [], requiredReasonCodes: ["HVAC_EXCLUDED_AUTHORITY_ESCALATION"] } },
  { id: "HVAC-DEGRADED-001", family: "HVAC", scenarioClass: "DEGRADED", trainingOnly: true, input: input("HVAC", { sourceAvailable: false }), expected: { disposition: "ABSTAINED", hypothesisKeys: [], requiredReasonCodes: ["SOURCE_UNAVAILABLE"] } },
  { id: "MISFIRE-NORMAL-001", family: "MISFIRE_DRIVABILITY", scenarioClass: "NORMAL", trainingOnly: true, input: input("MISFIRE_DRIVABILITY", { signals: [signal("IGNITION_FAULT", "DIRECT_SUPPORT", "IGNITION_CONTRIBUTION"), signal("IGNITION_FAULT", "CAUSAL_SUPPORT", "COUNTER_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["IGNITION_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "MISFIRE-MEASUREMENT-001", family: "MISFIRE_DRIVABILITY", scenarioClass: "MEASUREMENT", trainingOnly: true, input: input("MISFIRE_DRIVABILITY", { signals: [signal("MECHANICAL_FAULT", "DIRECT_SUPPORT", "RELATIVE_COMPRESSION"), signal("MECHANICAL_FAULT", "CAUSAL_SUPPORT", "CYLINDER_CONTRIBUTION")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["MECHANICAL_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "MISFIRE-MISLEADING-CODE-001", family: "MISFIRE_DRIVABILITY", scenarioClass: "MISLEADING_CODE", trainingOnly: true, input: input("MISFIRE_DRIVABILITY", { signals: [signal("MISFIRE_SCAN_OR_CODE_MISLEAD", "ASSOCIATION", "P030X_HISTORY"), signal("MISFIRE_SCAN_OR_CODE_MISLEAD", "CONTRADICTION", "FUEL_AIR_REVIEW"), signal("FUEL_MIXTURE_FAULT", "DIRECT_SUPPORT", "FUEL_TRIM_CONTEXT")] }), expected: { disposition: "CONFIRMED", hypothesisKeys: ["FUEL_MIXTURE_FAULT"], requiredReasonCodes: ["CONCLUSION_CAUSAL_SUPPORT"] } },
  { id: "MISFIRE-UNSAFE-001", family: "MISFIRE_DRIVABILITY", scenarioClass: "UNSAFE", trainingOnly: true, input: input("MISFIRE_DRIVABILITY", { safetyBlocked: true }), expected: { disposition: "ESCALATED", hypothesisKeys: [], requiredReasonCodes: ["MISFIRE_FIRE_ROTATING_OR_ROAD_TEST_STOP"] } },
  { id: "MISFIRE-NFF-001", family: "MISFIRE_DRIVABILITY", scenarioClass: "NO_FAULT_FOUND", trainingOnly: true, input: input("MISFIRE_DRIVABILITY", { concernReproduced: false, signals: [signal("MISFIRE_SCAN_OR_CODE_MISLEAD", "ASSOCIATION", "HISTORY")] }), expected: { disposition: "NO_FAULT_FOUND", hypothesisKeys: [], requiredReasonCodes: ["CONCERN_NOT_REPRODUCED"] } }
]);

export function runPhase7MechanicalProofCorpus(corpus: readonly Phase7MechanicalProofScenario[] = PHASE_7_MECHANICAL_PROOF_CORPUS, evaluator: (input: Phase7MechanicalProofScenario["input"]) => Phase7MechanicalProofEngineResult = evaluatePhase7MechanicalProofScenario) {
  const scenarioIds = new Set<string>();
  const results = corpus.map((scenario) => {
    if (!scenario.trainingOnly) throw new Error(`Phase 7 proof scenario ${scenario.id} is not isolated from live case execution.`);
    if (scenarioIds.has(scenario.id)) throw new Error(`Phase 7 proof scenario ID ${scenario.id} is duplicated.`);
    scenarioIds.add(scenario.id);
    const result = evaluator(structuredClone(scenario.input));
    const passed = result.disposition === scenario.expected.disposition && JSON.stringify(unique(result.hypothesisKeys)) === JSON.stringify(unique(scenario.expected.hypothesisKeys)) && scenario.expected.requiredReasonCodes.every((code) => result.reasonCodes.includes(code));
    return { scenarioId: scenario.id, family: scenario.family, scenarioClass: scenario.scenarioClass, passed, result, expectedChecksum: hashEnterpriseCommand(scenario.expected), resultChecksum: hashEnterpriseCommand(result) };
  });
  const familyCoverage = unique(corpus.map((scenario) => scenario.family));
  const scenarioClassCoverage = unique(corpus.map((scenario) => scenario.scenarioClass));
  const passed = results.every((result) => result.passed) && familyCoverage.length === 3 && scenarioClassCoverage.length === 6;
  return { corpusVersion: PHASE_7_MECHANICAL_PROOF_CORPUS_VERSION, simulationOnly: true, blindedEvaluation: true, scenarioCount: results.length, familyCoverage, scenarioClassCoverage, passed, results, corpusChecksum: hashEnterpriseCommand(corpus), runChecksum: hashEnterpriseCommand(results) };
}
