import { evaluateAdaptiveDiagnosticTests, type DiagnosticAdaptiveTestingContext, type DiagnosticTestCandidateDefinition } from "./adaptive-testing";
import type { CoolingOverheatingProofEngineResult } from "./cooling-overheating-proof";
import { COOLING_OVERHEATING_PROOF_CORPUS_VERSION } from "./cooling-overheating-proof";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const COOLING_OVERHEATING_NEXT_TEST_READINESS_VERSION = "DGN-059/COOLING-NEXT-TEST-READINESS/1.0.0";

type CoolingNextTestReadinessStatus = "READY" | "BLOCKED" | "ESCALATED" | "NO_FAULT_FOUND";

type CoolingReadinessVehicle = {
  make: string;
  model: string;
  year: number;
  state: string;
  configuration?: Record<string, unknown>;
};

type CoolingReadinessEnvironment = {
  sourceAuthorized: boolean;
  systemCoolEnoughForSafeAccess: boolean;
  rotatingFanHazardControlled: boolean;
  toxicFluidHandlingReady: boolean;
  capabilities: string[];
  qualifications: string[];
  tools: string[];
  resources?: string[];
  authorizations?: string[];
  satisfiedPrerequisites?: string[];
};

export type CoolingOverheatingNextTestReadinessInput = {
  diagnosticCaseId: string;
  reasoningEvaluationId: string;
  proofResult: CoolingOverheatingProofEngineResult;
  proofResultChecksum?: string;
  now: string;
  vehicle: CoolingReadinessVehicle;
  environment: CoolingReadinessEnvironment;
};

const sourceKey = "DGN-SRC-006";
const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical))].sort((left, right) => left.localeCompare(right));

const candidate = (definition: Omit<DiagnosticTestCandidateDefinition, "sourceVersions" | "effectiveAt" | "applicability" | "requiredCapabilities" | "qualifications" | "requiredResources" | "requiredVehicleStates" | "requiredAuthorizations">, input: CoolingOverheatingNextTestReadinessInput): DiagnosticTestCandidateDefinition => ({
  ...definition,
  applicability: { requiredConfiguration: { genericEngineeringOnly: true } },
  requiredCapabilities: ["DIAGNOSTICS_ADVANCED_SHADOW"],
  qualifications: ["COOLING_SYSTEM_L2"],
  requiredResources: [],
  requiredVehicleStates: ["STATIC_SAFE", "ENGINE_RUNNING_OBSERVED", "ROAD_TEST_OBSERVED"],
  requiredAuthorizations: [],
  effectiveAt: "2026-07-22T00:00:00.000Z",
  sourceVersions: [{ sourceKey, version: "DG-G7/COOLING-OVERHEATING/1.0.0", rightsStatus: input.environment.sourceAuthorized ? "AUTHORIZED" : "PENDING", effectiveAt: "2026-07-22T00:00:00.000Z" }]
});

function coolingDefinitions(input: CoolingOverheatingNextTestReadinessInput): DiagnosticTestCandidateDefinition[] {
  return [
    candidate({
      definitionVersionId: "COOL_PRESSURE_INTEGRITY:DGN-059:1",
      testKey: "COOL_PRESSURE_INTEGRITY",
      name: "Cooling pressure integrity",
      distinguishesHypothesisKeys: ["COOLANT_LEAK", "PRESSURE_CAP_FAULT"],
      resolvesConflictKeys: ["COOLING_ROOT_CAUSE_UNVERIFIED", "COOLING_PRESSURE_CONFLICT"],
      outcomePartitions: [{ outcomeKey: "LOSS_OR_LEAK", hypothesisKeys: ["COOLANT_LEAK"] }, { outcomeKey: "CAP_OR_SEAL", hypothesisKeys: ["PRESSURE_CAP_FAULT"] }],
      prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "SYSTEM_COOL_ENOUGH_FOR_SAFE_ACCESS"],
      hazards: ["HOT_PRESSURIZED_COOLANT", "TOXIC_FLUID_HANDLING"],
      tools: ["COOLING_PRESSURE_TESTER"],
      estimatedMinutes: 15,
      estimatedCostCents: 0,
      invasiveness: 0.25,
      vehicleRisk: 0.2,
      setupDelay: 0.2,
      resourceReadiness: 0.9,
      reliability: 0.86,
      riskReduction: 0.72,
      downstreamUnblocking: 0.66
    }, input),
    candidate({
      definitionVersionId: "COOL_THERMAL_PROFILE:DGN-059:1",
      testKey: "COOL_THERMAL_PROFILE",
      name: "Cooling thermal profile",
      distinguishesHypothesisKeys: ["FLOW_RESTRICTION", "AIRFLOW_DEFICIT", "PRESSURE_CAP_FAULT"],
      resolvesConflictKeys: ["COOLING_ROOT_CAUSE_UNVERIFIED", "COOLING_FLOW_AIRFLOW_CONFLICT"],
      outcomePartitions: [{ outcomeKey: "FLOW_LIMITED", hypothesisKeys: ["FLOW_RESTRICTION"] }, { outcomeKey: "AIRFLOW_LIMITED", hypothesisKeys: ["AIRFLOW_DEFICIT"] }, { outcomeKey: "PRESSURE_LIMITED", hypothesisKeys: ["PRESSURE_CAP_FAULT"] }],
      prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED"],
      hazards: ["ROTATING_FAN_COMPONENTS"],
      tools: ["SCAN_TOOL", "THERMAL_MEASUREMENT_TOOL"],
      estimatedMinutes: 20,
      estimatedCostCents: 0,
      invasiveness: 0.12,
      vehicleRisk: 0.14,
      setupDelay: 0.18,
      resourceReadiness: 0.88,
      reliability: 0.82,
      riskReduction: 0.62,
      downstreamUnblocking: 0.72
    }, input),
    candidate({
      definitionVersionId: "COOL_FAN_COMMAND_RESPONSE:DGN-059:1",
      testKey: "COOL_FAN_COMMAND_RESPONSE",
      name: "Cooling fan command and response",
      distinguishesHypothesisKeys: ["AIRFLOW_DEFICIT", "SENSOR_OR_SCAN_MISLEAD"],
      resolvesConflictKeys: ["COOLING_FAN_RESPONSE_CONFLICT"],
      outcomePartitions: [{ outcomeKey: "FAN_RESPONSE_FAULT", hypothesisKeys: ["AIRFLOW_DEFICIT"] }, { outcomeKey: "COMMAND_OR_SCAN_MISLEAD", hypothesisKeys: ["SENSOR_OR_SCAN_MISLEAD"] }],
      prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED"],
      hazards: ["ROTATING_FAN_COMPONENTS"],
      tools: ["SCAN_TOOL", "CALIBRATED_DVOM"],
      estimatedMinutes: 16,
      estimatedCostCents: 0,
      invasiveness: 0.18,
      vehicleRisk: 0.22,
      setupDelay: 0.2,
      resourceReadiness: 0.86,
      reliability: 0.8,
      riskReduction: 0.68,
      downstreamUnblocking: 0.65
    }, input),
    candidate({
      definitionVersionId: "COOL_COMBUSTION_GAS_SCREEN:DGN-059:1",
      testKey: "COOL_COMBUSTION_GAS_SCREEN",
      name: "Combustion gas screen",
      distinguishesHypothesisKeys: ["COMBUSTION_GAS_INTRUSION", "COOLANT_LEAK"],
      resolvesConflictKeys: ["COOLING_INTERNAL_LEAK_CONFLICT"],
      outcomePartitions: [{ outcomeKey: "COMBUSTION_GAS_PRESENT", hypothesisKeys: ["COMBUSTION_GAS_INTRUSION"] }, { outcomeKey: "COMBUSTION_GAS_NOT_SUPPORTED", hypothesisKeys: ["COOLANT_LEAK"] }],
      prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "SYSTEM_COOL_ENOUGH_FOR_SAFE_ACCESS"],
      hazards: ["HOT_PRESSURIZED_COOLANT", "TOXIC_FLUID_HANDLING"],
      tools: ["COMBUSTION_GAS_TESTER"],
      estimatedMinutes: 18,
      estimatedCostCents: 1200,
      invasiveness: 0.3,
      vehicleRisk: 0.24,
      setupDelay: 0.24,
      resourceReadiness: 0.76,
      reliability: 0.74,
      riskReduction: 0.78,
      downstreamUnblocking: 0.8
    }, input)
  ];
}

function readinessContext(input: CoolingOverheatingNextTestReadinessInput): DiagnosticAdaptiveTestingContext {
  const hazards = [
    ...(input.environment.systemCoolEnoughForSafeAccess ? ["HOT_PRESSURIZED_COOLANT"] : []),
    ...(input.environment.rotatingFanHazardControlled ? ["ROTATING_FAN_COMPONENTS"] : []),
    ...(input.environment.toxicFluidHandlingReady ? ["TOXIC_FLUID_HANDLING"] : [])
  ];
  const prerequisites = [
    "VEHICLE_IDENTITY_CONFIRMED",
    ...(input.environment.sourceAuthorized ? ["SOURCE_APPLICABILITY_CONFIRMED"] : []),
    ...(input.environment.systemCoolEnoughForSafeAccess ? ["SYSTEM_COOL_ENOUGH_FOR_SAFE_ACCESS"] : []),
    ...(input.environment.satisfiedPrerequisites ?? [])
  ];
  const plausibleHypotheses = ["COOLANT_LEAK", "FLOW_RESTRICTION", "AIRFLOW_DEFICIT", "PRESSURE_CAP_FAULT", "COMBUSTION_GAS_INTRUSION", "SENSOR_OR_SCAN_MISLEAD"];
  const supported = new Set(input.proofResult.disposition === "CONFIRMED" ? unique(input.proofResult.hypothesisKeys) : []);
  return {
    diagnosticCaseId: input.diagnosticCaseId,
    reasoningEvaluationId: input.reasoningEvaluationId,
    reasoningResultChecksum: input.proofResultChecksum ?? hashEnterpriseCommand(input.proofResult),
    now: input.now,
    vehicle: { ...input.vehicle, configuration: { genericEngineeringOnly: true, ...(input.vehicle.configuration ?? {}) } },
    viableHypothesisKeys: unique(plausibleHypotheses),
    unresolvedConflictKeys: ["COOLING_ROOT_CAUSE_UNVERIFIED", "COOLING_PRESSURE_CONFLICT", "COOLING_FLOW_AIRFLOW_CONFLICT", "COOLING_FAN_RESPONSE_CONFLICT", "COOLING_INTERNAL_LEAK_CONFLICT"],
    hypothesisProbabilities: Object.fromEntries(plausibleHypotheses.map((hypothesis) => [hypothesis, supported.size ? supported.has(canonical(hypothesis)) ? 9 : 1 : 1])),
    satisfiedPrerequisites: unique(prerequisites),
    controlledHazards: unique(hazards),
    capabilities: unique(input.environment.capabilities),
    qualifications: unique(input.environment.qualifications),
    availableTools: unique(input.environment.tools),
    availableResources: unique(input.environment.resources ?? []),
    authorizations: unique(input.environment.authorizations ?? [])
  };
}

export function evaluateCoolingOverheatingNextTestReadiness(input: CoolingOverheatingNextTestReadinessInput) {
  if (input.proofResult.disposition === "ESCALATED") {
    const result = { status: "ESCALATED" as CoolingNextTestReadinessStatus, adaptiveEvaluation: null, recommendedTestKey: null, reasonCodes: unique(["COOLING_PROOF_ESCALATED", ...input.proofResult.reasonCodes]) };
    return { version: COOLING_OVERHEATING_NEXT_TEST_READINESS_VERSION, proofCorpusVersion: COOLING_OVERHEATING_PROOF_CORPUS_VERSION, shadowOnly: true, liveExecutionAuthorized: false, ...result, resultChecksum: hashEnterpriseCommand(result) };
  }
  if (input.proofResult.disposition === "NO_FAULT_FOUND") {
    const result = { status: "NO_FAULT_FOUND" as CoolingNextTestReadinessStatus, adaptiveEvaluation: null, recommendedTestKey: null, reasonCodes: unique(["COOLING_NO_FAULT_FOUND_HOLD", ...input.proofResult.reasonCodes]) };
    return { version: COOLING_OVERHEATING_NEXT_TEST_READINESS_VERSION, proofCorpusVersion: COOLING_OVERHEATING_PROOF_CORPUS_VERSION, shadowOnly: true, liveExecutionAuthorized: false, ...result, resultChecksum: hashEnterpriseCommand(result) };
  }
  const context = readinessContext(input);
  const adaptiveEvaluation = evaluateAdaptiveDiagnosticTests({ context, definitions: coolingDefinitions(input), maximumLookAheadTests: 2 });
  const status: CoolingNextTestReadinessStatus = adaptiveEvaluation.abstentionRequired ? "BLOCKED" : "READY";
  const result = { status, adaptiveEvaluation, recommendedTestKey: adaptiveEvaluation.recommendedTestKey, reasonCodes: unique([status === "READY" ? "COOLING_NEXT_TEST_READY_SHADOW_ONLY" : "COOLING_NEXT_TEST_BLOCKED", ...adaptiveEvaluation.reasonCodes]) };
  return { version: COOLING_OVERHEATING_NEXT_TEST_READINESS_VERSION, proofCorpusVersion: COOLING_OVERHEATING_PROOF_CORPUS_VERSION, shadowOnly: true, liveExecutionAuthorized: false, ...result, resultChecksum: hashEnterpriseCommand(result) };
}
