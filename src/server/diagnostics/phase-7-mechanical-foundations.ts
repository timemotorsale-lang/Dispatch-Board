import { normalizeDiagnosticKnowledgePackage, type DiagnosticKnowledgePackage, type DiagnosticKnowledgeRights, type DiagnosticReleaseState } from "./knowledge-domain";
import { normalizeDiagnosticTestDefinition } from "./test-execution-domain";

export const PHASE_7_MECHANICAL_FOUNDATIONS_VERSION = "PHASE-7/BRAKE-HVAC-MISFIRE-FOUNDATIONS/1.0.0";

export type Phase7MechanicalFamilyKey = "BRAKE" | "HVAC" | "MISFIRE_DRIVABILITY";
export type Phase7MechanicalFoundationGovernance = {
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

type FamilySeed = {
  key: Phase7MechanicalFamilyKey;
  sourceKey: string;
  ruleSetKey: string;
  domain: string;
  purpose: string;
  excludes: string[];
  qualification: string;
  baseHazards: string[];
  nodes: DiagnosticKnowledgePackage["nodes"];
  edges: DiagnosticKnowledgePackage["edges"];
  rules: DiagnosticKnowledgePackage["rules"];
  tests: Array<{
    definitionKey: string;
    name: string;
    purpose: string;
    riskTier: "R1" | "R2" | "R3";
    tools: string[];
    prerequisites: string[];
    hazards: string[];
    procedure: Array<{ code: string; instruction: string }>;
    requiredEvidence: Array<Record<string, unknown>>;
    estimatedMinutes: number;
  }>;
};

const node = (sourceKey: string, key: string, kind: DiagnosticKnowledgePackage["nodes"][number]["kind"], label: string) => ({ key, kind, label, sourceKeys: [sourceKey] });
const edge = (sourceKey: string, from: string, to: string, kind: DiagnosticKnowledgePackage["edges"][number]["kind"]) => ({ from, to, kind, sourceKeys: [sourceKey] });

const brakeSource = "DGN-SRC-007";
const hvacSource = "DGN-SRC-008";
const misfireSource = "DGN-SRC-009";

const seeds: FamilySeed[] = [
  {
    key: "BRAKE",
    sourceKey: brakeSource,
    ruleSetKey: "BRAKE_NOISE_PULSATION_HYDRAULIC_FOUNDATION",
    domain: "BRAKE_NOISE_PULSATION_HYDRAULIC",
    purpose: "Generic, measurement-first brake noise, pulsation, and hydraulic concern topology without vehicle-specific specifications, ABS programming authority, or road-test authorization.",
    excludes: ["ABS_STABILITY_PROGRAMMING", "ELECTRONIC_PARKING_BRAKE_SERVICE_MODE_EXECUTION", "UNCONTROLLED_ROAD_TEST", "UNLICENSED_VEHICLE_SPECIFIC_THRESHOLD"],
    qualification: "BRAKE_DIAGNOSIS_L2",
    baseHazards: ["BRAKE_SAFETY_CRITICAL_SYSTEM", "LIFTING_AND_WHEEL_REMOVAL", "ROAD_TEST_RISK"],
    nodes: [
      node(brakeSource, "BRAKE_SYSTEM", "SYSTEM", "Brake, ABS, and stability system"),
      node(brakeSource, "FRICTION_INTERFACE", "FUNCTION", "Pad, rotor, shoe, drum, and hardware friction interface"),
      node(brakeSource, "HYDRAULIC_PRESSURE", "FUNCTION", "Brake hydraulic pressure generation and transfer"),
      node(brakeSource, "WHEEL_SPEED_CONTROL", "FUNCTION", "ABS and stability wheel-speed control feedback"),
      node(brakeSource, "BRAKE_NOISE", "FAILURE_MODE", "Brake noise or grinding condition"),
      node(brakeSource, "BRAKE_PULSATION", "FAILURE_MODE", "Brake pulsation or runout concern"),
      node(brakeSource, "HYDRAULIC_SOFT_PEDAL", "FAILURE_MODE", "Soft pedal, air, leak, or bypass concern"),
      node(brakeSource, "BRAKE_PULL_DRAG", "FAILURE_MODE", "Brake pull, drag, or uneven application"),
      node(brakeSource, "BRAKE_FRICTION_INSPECTION", "TEST", "Brake friction and hardware inspection"),
      node(brakeSource, "BRAKE_RUNOUT_MEASUREMENT", "TEST", "Rotor/drum runout and thickness variation measurement"),
      node(brakeSource, "BRAKE_HYDRAULIC_PRESSURE_TEST", "TEST", "Brake hydraulic pressure and leak integrity test"),
      node(brakeSource, "BRAKE_SAFE_ROAD_TEST_SCREEN", "TEST", "Controlled brake road-test screening"),
      node(brakeSource, "BRAKE_ESCALATION", "ESCALATION", "Brake safety escalation")
    ],
    edges: [
      edge(brakeSource, "BRAKE_SYSTEM", "FRICTION_INTERFACE", "CONTAINS"),
      edge(brakeSource, "BRAKE_SYSTEM", "HYDRAULIC_PRESSURE", "CONTAINS"),
      edge(brakeSource, "BRAKE_SYSTEM", "WHEEL_SPEED_CONTROL", "CONTAINS"),
      edge(brakeSource, "FRICTION_INTERFACE", "BRAKE_NOISE", "CAN_FAIL_AS"),
      edge(brakeSource, "FRICTION_INTERFACE", "BRAKE_PULSATION", "CAN_FAIL_AS"),
      edge(brakeSource, "HYDRAULIC_PRESSURE", "HYDRAULIC_SOFT_PEDAL", "CAN_FAIL_AS"),
      edge(brakeSource, "HYDRAULIC_PRESSURE", "BRAKE_PULL_DRAG", "CAN_FAIL_AS"),
      edge(brakeSource, "BRAKE_NOISE", "BRAKE_FRICTION_INSPECTION", "DETECTED_BY"),
      edge(brakeSource, "BRAKE_PULSATION", "BRAKE_RUNOUT_MEASUREMENT", "DETECTED_BY"),
      edge(brakeSource, "HYDRAULIC_SOFT_PEDAL", "BRAKE_HYDRAULIC_PRESSURE_TEST", "DETECTED_BY"),
      edge(brakeSource, "BRAKE_PULL_DRAG", "BRAKE_SAFE_ROAD_TEST_SCREEN", "DETECTED_BY"),
      edge(brakeSource, "BRAKE_SYSTEM", "BRAKE_ESCALATION", "ESCALATES_TO")
    ],
    rules: [
      { key: "BRAKE_RULE_SAFETY_PRECEDENCE", precedence: 1, effect: "STOP_OR_ESCALATE", when: "BRAKE_SAFETY_OR_ROAD_TEST_RISK_UNCONTROLLED" },
      { key: "BRAKE_RULE_MEASUREMENT_FIRST", precedence: 2, effect: "REQUIRE_AFFIRMATIVE_EVIDENCE", when: "BRAKE_COMPONENT_REPLACEMENT_CONSIDERED" },
      { key: "BRAKE_RULE_NO_CODE_TO_PART", precedence: 3, effect: "RETAIN_ALTERNATIVES", when: "ABS_OR_STABILITY_CODE_ONLY" }
    ],
    tests: [
      { definitionKey: "BRAKE_FRICTION_HARDWARE_INSPECTION", name: "Brake friction and hardware inspection", purpose: "Inspect friction material, rotor/drum condition, hardware, heat signs, and leak evidence without concluding from noise alone.", riskTier: "R2", tools: ["LIFT_OR_SAFE_SUPPORT", "BRAKE_MEASUREMENT_TOOLS"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "WHEEL_REMOVAL_SAFE_STATE"], hazards: ["LIFTING_AND_WHEEL_REMOVAL", "BRAKE_DUST_HANDLING"], procedure: [{ code: "CONFIRM_SAFE_SUPPORT", instruction: "Confirm lift/support and wheel-removal safety." }, { code: "DOCUMENT_FRICTION_CONDITION", instruction: "Record pad/shoe, rotor/drum, hardware, heat, and leak observations." }, { code: "PRESERVE_PHOTOS", instruction: "Attach governed photo evidence for abnormal findings." }], requiredEvidence: [{ code: "FRICTION_CONDITION", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 18 },
      { definitionKey: "BRAKE_ROTOR_RUNOUT_MEASUREMENT", name: "Brake rotor runout measurement", purpose: "Measure rotor/drum runout or thickness variation using source-approved setup and limits.", riskTier: "R2", tools: ["DIAL_INDICATOR", "MICROMETER"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "WHEEL_REMOVAL_SAFE_STATE"], hazards: ["LIFTING_AND_WHEEL_REMOVAL"], procedure: [{ code: "SETUP_INDICATOR", instruction: "Set up measurement equipment per approved procedure." }, { code: "CAPTURE_RUNOUT", instruction: "Capture runout or thickness variation readings and setup context." }], requiredEvidence: [{ code: "RUNOUT_MEASUREMENT", type: "MEASUREMENT", quantity: "DISTANCE", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 16 },
      { definitionKey: "BRAKE_HYDRAULIC_PRESSURE_INTEGRITY", name: "Brake hydraulic pressure integrity", purpose: "Check hydraulic pressure, leak, pedal, and bypass evidence without unsafe road operation.", riskTier: "R3", tools: ["BRAKE_PRESSURE_GAUGES", "SCAN_TOOL"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "BRAKE_FLUID_SAFE_HANDLING"], hazards: ["BRAKE_SAFETY_CRITICAL_SYSTEM", "TOXIC_FLUID_HANDLING"], procedure: [{ code: "CHECK_FLUID_LEAKS", instruction: "Record fluid level, leaks, contamination, and pedal condition." }, { code: "MEASURE_PRESSURE", instruction: "Measure hydraulic pressure only with approved adapters and procedure." }], requiredEvidence: [{ code: "HYDRAULIC_PRESSURE", type: "MEASUREMENT", quantity: "PRESSURE", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 22 },
      { definitionKey: "BRAKE_CONTROLLED_ROAD_TEST_SCREEN", name: "Controlled brake road-test screen", purpose: "Screen brake pull, pulsation, or noise only when road-test risk, route, driver qualification, and authority are documented.", riskTier: "R3", tools: ["SCAN_TOOL"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "ROAD_TEST_AUTHORIZED", "SAFE_ROUTE_CONFIRMED"], hazards: ["ROAD_TEST_RISK", "BRAKE_SAFETY_CRITICAL_SYSTEM"], procedure: [{ code: "CONFIRM_ROAD_TEST_AUTHORITY", instruction: "Confirm road-test route, qualification, traffic/weather, and stop criteria." }, { code: "CAPTURE_SYMPTOM", instruction: "Record operating conditions and symptom reproduction without exceeding safe limits." }], requiredEvidence: [{ code: "BRAKE_ROAD_TEST_OBSERVATION", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 20 }
    ]
  },
  {
    key: "HVAC",
    sourceKey: hvacSource,
    ruleSetKey: "HVAC_PERFORMANCE_FOUNDATION",
    domain: "HVAC_PERFORMANCE",
    purpose: "Generic HVAC performance topology for cooling, heating, airflow, and control response without refrigerant service authority, leak-repair authority, or high-voltage thermal-management authority.",
    excludes: ["REFRIGERANT_RECOVERY_CHARGE_EXECUTION", "HIGH_VOLTAGE_THERMAL_MANAGEMENT", "REFRIGERANT_LEAK_REPAIR_AUTHORITY", "UNLICENSED_VEHICLE_SPECIFIC_THRESHOLD"],
    qualification: "HVAC_DIAGNOSIS_L2",
    baseHazards: ["REFRIGERANT_PRESSURE", "ROTATING_COMPONENTS", "HOT_COOLANT_OR_HEATER_CIRCUIT"],
    nodes: [
      node(hvacSource, "HVAC_SYSTEM", "SYSTEM", "HVAC and climate-control system"),
      node(hvacSource, "REFRIGERANT_LOOP", "FUNCTION", "A/C refrigerant pressure and heat exchange loop"),
      node(hvacSource, "AIRFLOW_DISTRIBUTION", "FUNCTION", "Cabin airflow, blower, and door distribution"),
      node(hvacSource, "HEATING_EXCHANGE", "FUNCTION", "Heater-core and coolant heat exchange"),
      node(hvacSource, "CONTROL_COMMAND_FEEDBACK", "FUNCTION", "HVAC command and feedback controls"),
      node(hvacSource, "REFRIGERANT_PERFORMANCE_FAULT", "FAILURE_MODE", "A/C performance or pressure relationship fault"),
      node(hvacSource, "AIRFLOW_RESTRICTION", "FAILURE_MODE", "Cabin airflow restriction or blower issue"),
      node(hvacSource, "TEMPERATURE_DOOR_FAULT", "FAILURE_MODE", "Blend/mode/temperature door response fault"),
      node(hvacSource, "HEATER_PERFORMANCE_FAULT", "FAILURE_MODE", "Heating performance or heater-circuit concern"),
      node(hvacSource, "HVAC_TEMP_PRESSURE_PROFILE", "TEST", "HVAC temperature and pressure profile"),
      node(hvacSource, "HVAC_AIRFLOW_COMMAND_RESPONSE", "TEST", "HVAC airflow and command response"),
      node(hvacSource, "HVAC_HEATER_COMPARISON", "TEST", "Heater performance comparison"),
      node(hvacSource, "HVAC_CONTROL_SCAN_REVIEW", "TEST", "HVAC control scan review"),
      node(hvacSource, "HVAC_ESCALATION", "ESCALATION", "HVAC safety or source escalation")
    ],
    edges: [
      edge(hvacSource, "HVAC_SYSTEM", "REFRIGERANT_LOOP", "CONTAINS"),
      edge(hvacSource, "HVAC_SYSTEM", "AIRFLOW_DISTRIBUTION", "CONTAINS"),
      edge(hvacSource, "HVAC_SYSTEM", "HEATING_EXCHANGE", "CONTAINS"),
      edge(hvacSource, "HVAC_SYSTEM", "CONTROL_COMMAND_FEEDBACK", "CONTAINS"),
      edge(hvacSource, "REFRIGERANT_LOOP", "REFRIGERANT_PERFORMANCE_FAULT", "CAN_FAIL_AS"),
      edge(hvacSource, "AIRFLOW_DISTRIBUTION", "AIRFLOW_RESTRICTION", "CAN_FAIL_AS"),
      edge(hvacSource, "CONTROL_COMMAND_FEEDBACK", "TEMPERATURE_DOOR_FAULT", "CAN_FAIL_AS"),
      edge(hvacSource, "HEATING_EXCHANGE", "HEATER_PERFORMANCE_FAULT", "CAN_FAIL_AS"),
      edge(hvacSource, "REFRIGERANT_PERFORMANCE_FAULT", "HVAC_TEMP_PRESSURE_PROFILE", "DETECTED_BY"),
      edge(hvacSource, "AIRFLOW_RESTRICTION", "HVAC_AIRFLOW_COMMAND_RESPONSE", "DETECTED_BY"),
      edge(hvacSource, "HEATER_PERFORMANCE_FAULT", "HVAC_HEATER_COMPARISON", "DETECTED_BY"),
      edge(hvacSource, "TEMPERATURE_DOOR_FAULT", "HVAC_CONTROL_SCAN_REVIEW", "DETECTED_BY"),
      edge(hvacSource, "HVAC_SYSTEM", "HVAC_ESCALATION", "ESCALATES_TO")
    ],
    rules: [
      { key: "HVAC_RULE_REFRIGERANT_AUTHORITY", precedence: 1, effect: "STOP_OR_ESCALATE", when: "REFRIGERANT_SERVICE_OR_OPEN_SYSTEM_REQUIRED" },
      { key: "HVAC_RULE_HIGH_VOLTAGE_EXCLUSION", precedence: 2, effect: "STOP_OR_ESCALATE", when: "HIGH_VOLTAGE_THERMAL_MANAGEMENT_PRESENT" },
      { key: "HVAC_RULE_MEASUREMENT_CONTEXT", precedence: 3, effect: "REQUIRE_AFFIRMATIVE_EVIDENCE", when: "TEMPERATURE_OR_PRESSURE_INTERPRETATION_REQUESTED" }
    ],
    tests: [
      { definitionKey: "HVAC_TEMP_PRESSURE_PROFILE", name: "HVAC temperature and pressure profile", purpose: "Capture vent temperature, ambient context, command state, and pressure relationships without authorizing refrigerant service.", riskTier: "R2", tools: ["SCAN_TOOL", "TEMPERATURE_PROBES", "HVAC_PRESSURE_GAUGES"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "REFRIGERANT_SERVICE_NOT_REQUESTED"], hazards: ["REFRIGERANT_PRESSURE", "ROTATING_COMPONENTS"], procedure: [{ code: "CAPTURE_CONTEXT", instruction: "Record ambient, command, blower, recirculation, and engine state." }, { code: "RECORD_PROFILE", instruction: "Record temperature and pressure observations without opening the refrigerant circuit." }], requiredEvidence: [{ code: "HVAC_TEMPERATURE_PROFILE", type: "MEASUREMENT", quantity: "TEMPERATURE", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 18 },
      { definitionKey: "HVAC_AIRFLOW_COMMAND_RESPONSE", name: "HVAC airflow and command response", purpose: "Verify blower, mode, and airflow response using command and observation evidence.", riskTier: "R1", tools: ["SCAN_TOOL", "AIRFLOW_METER"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED"], hazards: ["ROTATING_COMPONENTS"], procedure: [{ code: "COMMAND_MODES", instruction: "Command blower, mode, and recirculation states where permitted." }, { code: "OBSERVE_RESPONSE", instruction: "Record airflow direction, speed, noise, and response evidence." }], requiredEvidence: [{ code: "AIRFLOW_RESPONSE", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 14 },
      { definitionKey: "HVAC_HEATER_PERFORMANCE_COMPARISON", name: "HVAC heater performance comparison", purpose: "Compare heater output and coolant/air temperature context without crossing into cooling-system repair authority.", riskTier: "R2", tools: ["SCAN_TOOL", "THERMAL_MEASUREMENT_TOOL"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "HOT_COMPONENT_CONTACT_CONTROLLED"], hazards: ["HOT_COOLANT_OR_HEATER_CIRCUIT"], procedure: [{ code: "CAPTURE_HEAT_CONTEXT", instruction: "Capture coolant temperature, heater output, blower state, and control command." }, { code: "COMPARE_HEAT_RESPONSE", instruction: "Record side-to-side and mode differences with raw evidence." }], requiredEvidence: [{ code: "HEATER_TEMPERATURE_COMPARISON", type: "MEASUREMENT", quantity: "TEMPERATURE", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 16 },
      { definitionKey: "HVAC_CONTROL_SCAN_REVIEW", name: "HVAC control scan review", purpose: "Review HVAC command, feedback, actuator, and calibration evidence without replacing parts from a code alone.", riskTier: "R1", tools: ["SCAN_TOOL"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED"], hazards: ["PINCH_POINT_ACTUATORS"], procedure: [{ code: "CAPTURE_CODES_DATA", instruction: "Capture codes, data, commands, and feedback states." }, { code: "RETAIN_ALTERNATIVES", instruction: "Retain actuator, wiring, calibration, and mechanical door alternatives." }], requiredEvidence: [{ code: "HVAC_SCAN_REVIEW", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 12 }
    ]
  },
  {
    key: "MISFIRE_DRIVABILITY",
    sourceKey: misfireSource,
    ruleSetKey: "MISFIRE_DRIVABILITY_FOUNDATION",
    domain: "MISFIRE_DRIVABILITY",
    purpose: "Generic misfire and drivability topology for ignition, fuel, air, mechanical contribution, and scan evidence without emissions certification, fuel-system opening, or road-test authority.",
    excludes: ["EMISSIONS_CERTIFICATION_DECISION", "FUEL_SYSTEM_OPENING", "UNCONTROLLED_ROAD_TEST", "MODULE_PROGRAMMING", "UNLICENSED_VEHICLE_SPECIFIC_THRESHOLD"],
    qualification: "DRIVABILITY_DIAGNOSIS_L2",
    baseHazards: ["ROTATING_ENGINE_COMPONENTS", "HOT_EXHAUST", "FUEL_FIRE_RISK", "ROAD_TEST_RISK"],
    nodes: [
      node(misfireSource, "MISFIRE_DRIVABILITY_SYSTEM", "SYSTEM", "Engine misfire and drivability system"),
      node(misfireSource, "IGNITION_ENERGY", "FUNCTION", "Ignition energy and timing contribution"),
      node(misfireSource, "FUEL_DELIVERY", "FUNCTION", "Fuel delivery and mixture contribution"),
      node(misfireSource, "AIR_METERING", "FUNCTION", "Air metering and induction contribution"),
      node(misfireSource, "MECHANICAL_COMPRESSION", "FUNCTION", "Mechanical compression and valve sealing contribution"),
      node(misfireSource, "SCAN_MISFIRE_COUNTERS", "FUNCTION", "Scan misfire counters and freeze-frame context"),
      node(misfireSource, "IGNITION_FAULT", "FAILURE_MODE", "Ignition contribution fault"),
      node(misfireSource, "FUEL_MIXTURE_FAULT", "FAILURE_MODE", "Fuel delivery or mixture fault"),
      node(misfireSource, "AIR_METERING_FAULT", "FAILURE_MODE", "Air metering or induction fault"),
      node(misfireSource, "MECHANICAL_FAULT", "FAILURE_MODE", "Mechanical compression or valve sealing fault"),
      node(misfireSource, "MISFIRE_SCAN_CONTEXT_REVIEW", "TEST", "Misfire scan context review"),
      node(misfireSource, "IGNITION_CONTRIBUTION_CHECK", "TEST", "Ignition contribution check"),
      node(misfireSource, "FUEL_AIR_DATA_REVIEW", "TEST", "Fuel and air data review"),
      node(misfireSource, "MECHANICAL_CONTRIBUTION_COMPARISON", "TEST", "Mechanical contribution comparison"),
      node(misfireSource, "MISFIRE_ESCALATION", "ESCALATION", "Misfire safety or emissions escalation")
    ],
    edges: [
      edge(misfireSource, "MISFIRE_DRIVABILITY_SYSTEM", "IGNITION_ENERGY", "CONTAINS"),
      edge(misfireSource, "MISFIRE_DRIVABILITY_SYSTEM", "FUEL_DELIVERY", "CONTAINS"),
      edge(misfireSource, "MISFIRE_DRIVABILITY_SYSTEM", "AIR_METERING", "CONTAINS"),
      edge(misfireSource, "MISFIRE_DRIVABILITY_SYSTEM", "MECHANICAL_COMPRESSION", "CONTAINS"),
      edge(misfireSource, "MISFIRE_DRIVABILITY_SYSTEM", "SCAN_MISFIRE_COUNTERS", "CONTAINS"),
      edge(misfireSource, "IGNITION_ENERGY", "IGNITION_FAULT", "CAN_FAIL_AS"),
      edge(misfireSource, "FUEL_DELIVERY", "FUEL_MIXTURE_FAULT", "CAN_FAIL_AS"),
      edge(misfireSource, "AIR_METERING", "AIR_METERING_FAULT", "CAN_FAIL_AS"),
      edge(misfireSource, "MECHANICAL_COMPRESSION", "MECHANICAL_FAULT", "CAN_FAIL_AS"),
      edge(misfireSource, "SCAN_MISFIRE_COUNTERS", "MISFIRE_SCAN_CONTEXT_REVIEW", "DETECTED_BY"),
      edge(misfireSource, "IGNITION_FAULT", "IGNITION_CONTRIBUTION_CHECK", "DETECTED_BY"),
      edge(misfireSource, "FUEL_MIXTURE_FAULT", "FUEL_AIR_DATA_REVIEW", "DETECTED_BY"),
      edge(misfireSource, "MECHANICAL_FAULT", "MECHANICAL_CONTRIBUTION_COMPARISON", "DETECTED_BY"),
      edge(misfireSource, "MISFIRE_DRIVABILITY_SYSTEM", "MISFIRE_ESCALATION", "ESCALATES_TO")
    ],
    rules: [
      { key: "MISFIRE_RULE_FLASHING_MIL_ESCALATION", precedence: 1, effect: "STOP_OR_ESCALATE", when: "CATALYST_DAMAGE_OR_UNSAFE_OPERATION_RISK" },
      { key: "MISFIRE_RULE_CODE_IS_NOT_COIL", precedence: 2, effect: "RETAIN_ALTERNATIVES", when: "P030X_OR_COUNTER_ONLY_SUPPORTS_PART" },
      { key: "MISFIRE_RULE_CONTRIBUTION_REQUIRED", precedence: 3, effect: "REQUIRE_AFFIRMATIVE_EVIDENCE", when: "CYLINDER_CAUSE_CONFIRMATION_REQUESTED" }
    ],
    tests: [
      { definitionKey: "MISFIRE_SCAN_CONTEXT_REVIEW", name: "Misfire scan context review", purpose: "Capture misfire counters, freeze-frame, fuel trim, mode data, and operating context without confirming a part from a code alone.", riskTier: "R1", tools: ["SCAN_TOOL"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED"], hazards: ["HOT_EXHAUST"], procedure: [{ code: "CAPTURE_COUNTERS", instruction: "Capture counters, freeze-frame, codes, trim, and load/speed context." }, { code: "BLOCK_CODE_TO_PART", instruction: "Keep ignition, fuel, air, mechanical, and control alternatives visible." }], requiredEvidence: [{ code: "MISFIRE_SCAN_CONTEXT", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 12 },
      { definitionKey: "MISFIRE_IGNITION_CONTRIBUTION_CHECK", name: "Ignition contribution check", purpose: "Check ignition contribution with safe tool setup and without unsafe spark or fuel exposure.", riskTier: "R2", tools: ["SCAN_TOOL", "OSCILLOSCOPE"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "IGNITION_TEST_SAFE_STATE"], hazards: ["IGNITION_HIGH_ENERGY", "ROTATING_ENGINE_COMPONENTS"], procedure: [{ code: "CONFIRM_SAFE_SETUP", instruction: "Confirm ignition test safety and tool connection." }, { code: "CAPTURE_CONTRIBUTION", instruction: "Record ignition command/response or contribution evidence." }], requiredEvidence: [{ code: "IGNITION_CONTRIBUTION_EVIDENCE", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 18 },
      { definitionKey: "MISFIRE_FUEL_AIR_DATA_REVIEW", name: "Fuel and air data review", purpose: "Review fuel trim, air metering, pressure/proxy, and induction evidence without opening fuel systems.", riskTier: "R2", tools: ["SCAN_TOOL", "FUEL_PRESSURE_SAFE_ADAPTER"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "FUEL_SYSTEM_OPENING_NOT_REQUIRED"], hazards: ["FUEL_FIRE_RISK", "ROTATING_ENGINE_COMPONENTS"], procedure: [{ code: "CAPTURE_FUEL_AIR_DATA", instruction: "Capture trim, airflow, pressure/proxy, and load context." }, { code: "ESCALATE_OPEN_FUEL_SYSTEM", instruction: "Escalate if open fuel-system work is needed." }], requiredEvidence: [{ code: "FUEL_AIR_DATA", type: "MEASUREMENT", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 20 },
      { definitionKey: "MISFIRE_MECHANICAL_CONTRIBUTION_COMPARISON", name: "Mechanical contribution comparison", purpose: "Compare mechanical contribution using non-destructive relative methods before invasive teardown.", riskTier: "R2", tools: ["SCAN_TOOL", "COMPRESSION_OR_PRESSURE_TRANSDUCER"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "ENGINE_MECHANICAL_TEST_SAFE_STATE"], hazards: ["ROTATING_ENGINE_COMPONENTS", "HOT_EXHAUST"], procedure: [{ code: "CAPTURE_RELATIVE_CONTRIBUTION", instruction: "Capture relative compression, cranking, vacuum, or pressure-transducer context." }, { code: "PRESERVE_LIMITATIONS", instruction: "Record limitations and do not authorize teardown from shadow result." }], requiredEvidence: [{ code: "MECHANICAL_CONTRIBUTION_COMPARISON", type: "MEASUREMENT", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 22 }
    ]
  }
];

function packageFor(seed: FamilySeed, governance: Phase7MechanicalFoundationGovernance, now: Date) {
  return normalizeDiagnosticKnowledgePackage({
    contractVersion: "PHASE-7/1.0.0",
    ruleSetKey: seed.ruleSetKey,
    version: 1,
    releaseState: governance.releaseState,
    purpose: seed.purpose,
    applicability: { domain: seed.domain, excludes: seed.excludes, vehicleSpecific: false },
    nodes: structuredClone(seed.nodes),
    edges: structuredClone(seed.edges),
    rules: structuredClone(seed.rules),
    testDefinitionKeys: seed.tests.map((test) => test.definitionKey),
    calculationVersions: ["DGN-021/1.0.0"],
    sourceCitations: [{ sourceKey: seed.sourceKey, purpose: `${seed.domain} generic engineering topology, safety precedence, and measurement-first test semantics.`, locator: { documents: ["DIAGNOSTICS_ROADMAP", "DGN-004"], sections: ["Phase 7 coverage expansion", "SRC-ENGINEERING"] } }],
    sources: [{
      sourceKey: seed.sourceKey,
      version: 1,
      rightsStatus: governance.rightsStatus,
      sourceClass: "ENGINEERING",
      ownerName: "Dispatch Board Diagnostics",
      sourceReference: `${seed.domain} generic engineering model governed by DGN-004 source policy`,
      revision: PHASE_7_MECHANICAL_FOUNDATIONS_VERSION,
      usageRights: { access: true, store: true, display: true, transform: true, derive: true, export: false, trainExternalModel: false },
      applicability: { genericEngineeringOnly: true, vehicleSpecificThresholds: false, excludedAuthority: seed.excludes },
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

function definitionsFor(seed: FamilySeed, governance: Phase7MechanicalFoundationGovernance, now: Date) {
  if (governance.rightsStatus !== "AUTHORIZED") throw new Error(`${seed.domain} test definitions require an authorized engineering source.`);
  const common = {
    expectedVersion: 0,
    definitionVersion: 1,
    effectiveAt: governance.effectiveAt,
    expiresAt: null,
    estimatedCostDecimal: null,
    ontologyLinks: [seed.nodes[0].key],
    applicability: { genericEngineeringOnly: true, excludes: seed.excludes, requiresVehicleSpecificLimitsWhenInterpreting: true },
    qualifications: [{ code: seed.qualification }],
    hazards: seed.baseHazards.map((code) => ({ code })),
    prerequisites: [{ code: "VEHICLE_IDENTITY_CONFIRMED" }, { code: "SOURCE_APPLICABILITY_CONFIRMED" }],
    vehicleState: { technicianMustConfirmExactState: true },
    branches: [],
    interpretations: [],
    sourceVersions: [{ sourceId: seed.sourceKey, version: PHASE_7_MECHANICAL_FOUNDATIONS_VERSION, rightsStatus: "AUTHORIZED", validUntil: null }],
    idempotencyKey: `PHASE-7-${seed.key}-SEED`,
    reason: `Release the independently reviewed generic ${seed.domain} test definition seed.`
  };
  return seed.tests.map((test, index) => normalizeDiagnosticTestDefinition({
    ...common,
    ...test,
    prerequisites: [...common.prerequisites, ...test.prerequisites.map((code) => ({ code }))],
    hazards: [...common.hazards, ...test.hazards.map((code) => ({ code }))],
    tools: test.tools.map((code) => ({ code })),
    idempotencyKey: `${common.idempotencyKey}-${index + 1}`
  }, now));
}

export function createControlledPhase7MechanicalKnowledgePackages(governance: Phase7MechanicalFoundationGovernance, now = new Date()) {
  return Object.fromEntries(seeds.map((seed) => [seed.key, packageFor(seed, governance, now)])) as Record<Phase7MechanicalFamilyKey, ReturnType<typeof packageFor>>;
}

export function createControlledPhase7MechanicalTestDefinitions(governance: Phase7MechanicalFoundationGovernance, now = new Date()) {
  return Object.fromEntries(seeds.map((seed) => [seed.key, definitionsFor(seed, governance, now)])) as Record<Phase7MechanicalFamilyKey, ReturnType<typeof definitionsFor>>;
}
