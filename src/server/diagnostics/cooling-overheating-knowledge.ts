import { normalizeDiagnosticKnowledgePackage, type DiagnosticKnowledgePackage, type DiagnosticKnowledgeRights, type DiagnosticReleaseState } from "./knowledge-domain";
import { normalizeDiagnosticTestDefinition } from "./test-execution-domain";

export const COOLING_OVERHEATING_KNOWLEDGE_VERSION = "DG-G7/COOLING-OVERHEATING/1.0.0";

const sourceKey = "DGN-SRC-006";
const nodes: DiagnosticKnowledgePackage["nodes"] = [
  { key: "COOLING_SYSTEM", kind: "SYSTEM", label: "Engine cooling and overheating system", sourceKeys: [sourceKey] },
  { key: "HEAT_GENERATION", kind: "FUNCTION", label: "Engine heat generation under operating load", sourceKeys: [sourceKey] },
  { key: "COOLANT_CIRCULATION", kind: "FUNCTION", label: "Coolant circulation through engine and heat exchangers", sourceKeys: [sourceKey] },
  { key: "PRESSURE_CONTROL", kind: "FUNCTION", label: "Sealed coolant pressure and boiling-point control", sourceKeys: [sourceKey] },
  { key: "TEMPERATURE_REGULATION", kind: "FUNCTION", label: "Thermostatic temperature regulation", sourceKeys: [sourceKey] },
  { key: "HEAT_REJECTION", kind: "FUNCTION", label: "Radiator and airflow heat rejection", sourceKeys: [sourceKey] },
  { key: "FAN_CONTROL", kind: "FUNCTION", label: "Cooling fan command and speed control", sourceKeys: [sourceKey] },
  { key: "SENSOR_FEEDBACK", kind: "FUNCTION", label: "Temperature and pressure feedback available for interpretation", sourceKeys: [sourceKey] },
  { key: "STABLE_TEMPERATURE_VERIFIED", kind: "VERIFICATION", label: "Stable temperature and no coolant loss verified", sourceKeys: [sourceKey] },
  { key: "COOLANT_LEAK", kind: "FAILURE_MODE", label: "External or internal coolant loss", sourceKeys: [sourceKey] },
  { key: "FLOW_RESTRICTION", kind: "FAILURE_MODE", label: "Restricted or inadequate coolant flow", sourceKeys: [sourceKey] },
  { key: "AIRFLOW_DEFICIT", kind: "FAILURE_MODE", label: "Insufficient airflow or heat-exchanger performance", sourceKeys: [sourceKey] },
  { key: "PRESSURE_CAP_FAULT", kind: "FAILURE_MODE", label: "Pressure cap or sealing fault", sourceKeys: [sourceKey] },
  { key: "COMBUSTION_GAS_INTRUSION", kind: "FAILURE_MODE", label: "Combustion gas intrusion into cooling system", sourceKeys: [sourceKey] },
  { key: "COOLING_PRESSURE_TEST", kind: "TEST", label: "Cooling system pressure integrity test", sourceKeys: [sourceKey] },
  { key: "THERMAL_PROFILE_TEST", kind: "TEST", label: "Thermal profile and flow comparison", sourceKeys: [sourceKey] },
  { key: "FAN_COMMAND_TEST", kind: "TEST", label: "Cooling fan command and response test", sourceKeys: [sourceKey] },
  { key: "COMBUSTION_GAS_SCREEN", kind: "TEST", label: "Combustion gas screen", sourceKeys: [sourceKey] },
  { key: "HIGH_VOLTAGE_THERMAL_ESCALATION", kind: "ESCALATION", label: "High-voltage thermal-management escalation", sourceKeys: [sourceKey] }
];

const edge = (from: string, to: string, kind: DiagnosticKnowledgePackage["edges"][number]["kind"]) => ({ from, to, kind, sourceKeys: [sourceKey] });
const edges: DiagnosticKnowledgePackage["edges"] = [
  edge("COOLING_SYSTEM", "HEAT_GENERATION", "CONTAINS"),
  edge("COOLING_SYSTEM", "COOLANT_CIRCULATION", "CONTAINS"),
  edge("COOLANT_CIRCULATION", "PRESSURE_CONTROL", "DEPENDS_ON"),
  edge("COOLANT_CIRCULATION", "TEMPERATURE_REGULATION", "DEPENDS_ON"),
  edge("COOLANT_CIRCULATION", "HEAT_REJECTION", "ENABLES"),
  edge("HEAT_REJECTION", "FAN_CONTROL", "DEPENDS_ON"),
  edge("SENSOR_FEEDBACK", "STABLE_TEMPERATURE_VERIFIED", "VERIFIED_BY"),
  edge("PRESSURE_CONTROL", "COOLANT_LEAK", "CAN_FAIL_AS"),
  edge("PRESSURE_CONTROL", "PRESSURE_CAP_FAULT", "CAN_FAIL_AS"),
  edge("COOLANT_CIRCULATION", "FLOW_RESTRICTION", "CAN_FAIL_AS"),
  edge("HEAT_REJECTION", "AIRFLOW_DEFICIT", "CAN_FAIL_AS"),
  edge("COOLANT_CIRCULATION", "COMBUSTION_GAS_INTRUSION", "CAN_FAIL_AS"),
  edge("COOLANT_LEAK", "COOLING_PRESSURE_TEST", "DETECTED_BY"),
  edge("PRESSURE_CAP_FAULT", "COOLING_PRESSURE_TEST", "DETECTED_BY"),
  edge("FLOW_RESTRICTION", "THERMAL_PROFILE_TEST", "DETECTED_BY"),
  edge("AIRFLOW_DEFICIT", "FAN_COMMAND_TEST", "DETECTED_BY"),
  edge("COMBUSTION_GAS_INTRUSION", "COMBUSTION_GAS_SCREEN", "DETECTED_BY"),
  edge("COOLING_SYSTEM", "HIGH_VOLTAGE_THERMAL_ESCALATION", "ESCALATES_TO")
];

export type CoolingOverheatingKnowledgeGovernance = {
  organizationId?: string;
  authoredByUserId: string;
  technicalReviewedByUserId: string | null;
  rightsReviewedByUserId: string | null;
  ruleSetReviewedByUserId: string | null;
  approvedAt: string | null;
  effectiveAt: string;
  retrievedAt: string;
  rightsStatus: DiagnosticKnowledgeRights;
  releaseState: DiagnosticReleaseState;
};

export function createControlledCoolingOverheatingKnowledgePackage(governance: CoolingOverheatingKnowledgeGovernance, now = new Date()) {
  return normalizeDiagnosticKnowledgePackage({
    contractVersion: "DG-G7/1.0.0",
    ruleSetKey: "COOLING_OVERHEATING_FOUNDATION",
    version: 1,
    releaseState: governance.releaseState,
    purpose: "Generic, measurement-first cooling and overheating topology without vehicle-specific thresholds, proprietary service procedures, or high-voltage thermal-management authority.",
    applicability: {
      domain: "ENGINE_COOLING_OVERHEATING",
      excludes: ["HIGH_VOLTAGE_THERMAL_MANAGEMENT", "PRESSURIZED_HOT_SYSTEM_OPENING", "UNLICENSED_VEHICLE_SPECIFIC_THRESHOLD"],
      vehicleSpecific: false
    },
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    rules: [
      { key: "COOL_RULE_SAFETY_PRECEDENCE", precedence: 1, effect: "STOP_OR_ESCALATE", when: "HOT_PRESSURIZED_SYSTEM_UNCONTROLLED" },
      { key: "COOL_RULE_APPLICABILITY_REQUIRED", precedence: 2, effect: "ABSTAIN", when: "VEHICLE_OR_SOURCE_APPLICABILITY_UNKNOWN" },
      { key: "COOL_RULE_MEASUREMENT_VALIDITY", precedence: 3, effect: "BLOCK_DEPENDENT_INFERENCE", when: "TEMPERATURE_PRESSURE_OR_SCAN_DATA_INVALID" },
      { key: "COOL_RULE_NO_DTC_TO_PART", precedence: 4, effect: "RETAIN_ALTERNATIVES", when: "ONLY_CODE_OR_COMMON_FIX_SUPPORTS_COMPONENT" },
      { key: "COOL_RULE_CONFIRMATION", precedence: 5, effect: "REQUIRE_AFFIRMATIVE_EVIDENCE", when: "CAUSE_CONFIRMATION_REQUESTED" }
    ],
    testDefinitionKeys: ["COOL_PRESSURE_INTEGRITY", "COOL_THERMAL_PROFILE", "COOL_FAN_COMMAND_RESPONSE", "COOL_COMBUSTION_GAS_SCREEN", "COOL_POST_REPAIR_VERIFICATION"],
    calculationVersions: ["DGN-021/1.0.0"],
    sourceCitations: [{ sourceKey, purpose: "Generic cooling-system functional topology, safety precedence, and measurement-first test semantics.", locator: { documents: ["DIAGNOSTICS_ROADMAP", "DGN-004"], sections: ["Phase 7 coverage expansion", "SRC-ENGINEERING"] } }],
    sources: [{
      sourceKey,
      version: 1,
      rightsStatus: governance.rightsStatus,
      sourceClass: "ENGINEERING",
      ownerName: "Dispatch Board Diagnostics",
      sourceReference: "Generic engine-cooling engineering model governed by DGN-004 source policy",
      revision: COOLING_OVERHEATING_KNOWLEDGE_VERSION,
      usageRights: { access: true, store: true, display: true, transform: true, derive: true, export: false, trainExternalModel: false },
      applicability: { genericEngineeringOnly: true, vehicleSpecificThresholds: false, highVoltageThermalSystems: false },
      retrievedAt: governance.retrievedAt,
      effectiveAt: governance.effectiveAt,
      expiresAt: null,
      withdrawnAt: null,
      withdrawalReasonCode: null,
      authoredByUserId: governance.authoredByUserId,
      technicalReviewedByUserId: governance.technicalReviewedByUserId,
      rightsReviewedByUserId: governance.rightsReviewedByUserId,
      approvedAt: governance.approvedAt,
      supersedesId: null
    }],
    authoredByUserId: governance.authoredByUserId,
    reviewedByUserId: governance.ruleSetReviewedByUserId,
    approvedAt: governance.approvedAt,
    effectiveAt: governance.effectiveAt,
    expiresAt: null,
    supersedesId: null,
    rollbackPredecessorId: null
  }, now);
}

export function createControlledCoolingOverheatingTestDefinitions(governance: CoolingOverheatingKnowledgeGovernance, now = new Date()) {
  if (governance.rightsStatus !== "AUTHORIZED") throw new Error("Cooling and overheating test definitions require an authorized engineering source.");
  const sourceVersions = [{ sourceId: sourceKey, version: COOLING_OVERHEATING_KNOWLEDGE_VERSION, rightsStatus: "AUTHORIZED", validUntil: null }];
  const common = {
    expectedVersion: 0,
    definitionVersion: 1,
    effectiveAt: governance.effectiveAt,
    expiresAt: null,
    estimatedCostDecimal: null,
    riskTier: "R2",
    ontologyLinks: ["COOLING_SYSTEM"],
    applicability: { genericEngineeringOnly: true, excludes: ["HIGH_VOLTAGE_THERMAL_MANAGEMENT", "HOT_PRESSURIZED_SYSTEM_OPENING"], requiresVehicleSpecificLimitsWhenInterpreting: true },
    qualifications: [{ code: "COOLING_SYSTEM_L2" }],
    hazards: [{ code: "HOT_PRESSURIZED_COOLANT" }, { code: "ROTATING_FAN_COMPONENTS" }, { code: "TOXIC_FLUID_HANDLING" }],
    prerequisites: [{ code: "VEHICLE_IDENTITY_CONFIRMED" }, { code: "SOURCE_APPLICABILITY_CONFIRMED" }, { code: "SYSTEM_COOL_ENOUGH_FOR_SAFE_ACCESS" }],
    tools: [{ code: "COOLING_PRESSURE_TESTER" }, { code: "SCAN_TOOL" }],
    vehicleState: { technicianMustConfirmExactState: true },
    branches: [],
    interpretations: [],
    sourceVersions,
    idempotencyKey: "DG-G7-COOLING-SEED",
    reason: "Release the independently reviewed generic cooling and overheating test definition seed."
  };
  const definitions = [
    {
      definitionKey: "COOL_PRESSURE_INTEGRITY",
      name: "Cooling pressure integrity",
      purpose: "Verify cooling-system pressure integrity and visible leak evidence without opening a hot pressurized system.",
      procedure: [{ code: "CONFIRM_COOL_SAFE_STATE", instruction: "Confirm the system is cool enough for safe access and pressure testing." }, { code: "APPLY_GOVERNED_PRESSURE", instruction: "Apply only the approved pressure from an authorized source for the specific vehicle." }, { code: "RECORD_LOSS_AND_LEAKS", instruction: "Record pressure loss, visible leaks, cap behavior, and raw evidence references." }],
      requiredEvidence: [{ code: "PRESSURE_HOLD_RESULT", type: "MEASUREMENT", quantity: "PRESSURE", minimumCount: 1, minimumIndependentGroups: 1 }, { code: "LEAK_OBSERVATION", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }],
      estimatedMinutes: 15
    },
    {
      definitionKey: "COOL_THERMAL_PROFILE",
      name: "Cooling thermal profile",
      purpose: "Compare temperature behavior across warm-up, thermostat opening, radiator exchange, and heater output without asserting universal thresholds.",
      tools: [{ code: "SCAN_TOOL" }, { code: "THERMAL_MEASUREMENT_TOOL" }],
      procedure: [{ code: "CAPTURE_WARMUP", instruction: "Capture coolant-temperature and operating-state progression from a documented safe state." }, { code: "COMPARE_HEAT_EXCHANGE", instruction: "Record radiator, hose, and heater temperature relationships using source-approved interpretation." }, { code: "PRESERVE_CONTEXT", instruction: "Preserve ambient temperature, fan state, vehicle speed/load state, and raw readings." }],
      requiredEvidence: [{ code: "COOLANT_TEMPERATURE_PROFILE", type: "MEASUREMENT", quantity: "TEMPERATURE", minimumCount: 2, minimumIndependentGroups: 1 }, { code: "THERMAL_COMPARISON", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }],
      estimatedMinutes: 20
    },
    {
      definitionKey: "COOL_FAN_COMMAND_RESPONSE",
      name: "Cooling fan command and response",
      purpose: "Verify fan command, speed response, power/ground readiness, and airflow contribution without bypassing safety or control authority.",
      tools: [{ code: "SCAN_TOOL" }, { code: "CALIBRATED_DVOM" }],
      procedure: [{ code: "CONFIRM_FAN_HAZARD_CONTROL", instruction: "Confirm hands, tools, wiring, and guards are clear before command or observation." }, { code: "CAPTURE_COMMAND_RESPONSE", instruction: "Capture requested fan command, actual fan response, and supporting electrical evidence." }, { code: "BLOCK_UNSAFE_BYPASS", instruction: "Do not bypass fan control or force unsafe actuation outside approved procedure." }],
      requiredEvidence: [{ code: "FAN_COMMAND_STATE", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }, { code: "FAN_RESPONSE_STATE", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }],
      estimatedMinutes: 16
    },
    {
      definitionKey: "COOL_COMBUSTION_GAS_SCREEN",
      name: "Combustion gas screen",
      purpose: "Screen for combustion-gas intrusion when overheating or coolant loss evidence makes internal leakage plausible.",
      procedure: [{ code: "CONFIRM_TEST_APPLICABILITY", instruction: "Confirm symptoms and safety state make a combustion-gas screen applicable." }, { code: "RUN_SCREEN", instruction: "Run the approved screen per tool/source instructions and preserve raw result evidence." }, { code: "ESCALATE_AMBIGUOUS_RESULT", instruction: "Escalate ambiguous, contaminated, or conflicting results instead of confirming internal failure." }],
      requiredEvidence: [{ code: "COMBUSTION_GAS_SCREEN_RESULT", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }],
      estimatedMinutes: 18
    },
    {
      definitionKey: "COOL_POST_REPAIR_VERIFICATION",
      name: "Post-repair cooling verification",
      purpose: "Verify stable temperature, no coolant loss, fan operation, and no recurrence after an authorized cooling-system repair.",
      procedure: [{ code: "RECHECK_ORIGINAL_CONCERN", instruction: "Repeat the concern-specific operating condition that produced overheating or coolant loss." }, { code: "VERIFY_STABILITY", instruction: "Capture stable temperature behavior, pressure/leak status, fan state, and customer-facing limitations." }, { code: "REOPEN_ON_FAILURE", instruction: "Return to diagnostic testing if overheating, loss, unsafe state, or conflicting evidence remains." }],
      requiredEvidence: [{ code: "STABLE_TEMPERATURE_VERIFIED", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }, { code: "NO_COOLANT_LOSS_VERIFIED", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }],
      estimatedMinutes: 20
    }
  ];
  return definitions.map((definition, index) => normalizeDiagnosticTestDefinition({ ...common, ...definition, idempotencyKey: `${common.idempotencyKey}-${index + 1}` }, now));
}
