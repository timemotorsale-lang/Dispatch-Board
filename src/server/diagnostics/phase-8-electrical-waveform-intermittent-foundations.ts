import { normalizeDiagnosticKnowledgePackage, type DiagnosticKnowledgePackage, type DiagnosticKnowledgeRights, type DiagnosticReleaseState } from "./knowledge-domain";
import { normalizeDiagnosticTestDefinition } from "./test-execution-domain";

export const PHASE_8_ELECTRICAL_WAVEFORM_INTERMITTENT_FOUNDATIONS_VERSION = "PHASE-8/ELECTRICAL-WAVEFORM-INTERMITTENT-FOUNDATIONS/1.0.0";

export type Phase8ElectricalFamilyKey = "ELECTRICAL_CIRCUIT" | "WAVEFORM_ANALYSIS" | "INTERMITTENT_FAULT";
export type Phase8ElectricalFoundationGovernance = {
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

type TestSeed = {
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
};

type FamilySeed = {
  key: Phase8ElectricalFamilyKey;
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
  tests: TestSeed[];
};

const node = (sourceKey: string, key: string, kind: DiagnosticKnowledgePackage["nodes"][number]["kind"], label: string) => ({ key, kind, label, sourceKeys: [sourceKey] });
const edge = (sourceKey: string, from: string, to: string, kind: DiagnosticKnowledgePackage["edges"][number]["kind"]) => ({ from, to, kind, sourceKeys: [sourceKey] });

const electricalSource = "DGN-SRC-010";
const waveformSource = "DGN-SRC-011";
const intermittentSource = "DGN-SRC-012";

const seeds: FamilySeed[] = [
  {
    key: "ELECTRICAL_CIRCUIT",
    sourceKey: electricalSource,
    ruleSetKey: "ELECTRICAL_CIRCUIT_FOUNDATION",
    domain: "ELECTRICAL_CIRCUIT_DIAGNOSIS",
    purpose: "Generic circuit diagnosis topology for power, ground, load, control, and network-adjacent circuits without vehicle-specific wiring diagrams, programming, or energized high-voltage authority.",
    excludes: ["HIGH_VOLTAGE_LIVE_WORK", "MODULE_PROGRAMMING", "AIRBAG_OR_PYROTECHNIC_CIRCUIT_SERVICE", "UNLICENSED_VEHICLE_SPECIFIC_WIRING", "UNLICENSED_VEHICLE_SPECIFIC_THRESHOLD"],
    qualification: "ELECTRICAL_DIAGNOSIS_L2",
    baseHazards: ["ELECTRICAL_SHORT_ARC", "BATTERY_ENERGY", "ROTATING_COMPONENTS"],
    nodes: [
      node(electricalSource, "ELECTRICAL_CIRCUIT_SYSTEM", "SYSTEM", "Electrical circuit diagnosis system"),
      node(electricalSource, "POWER_FEED", "FUNCTION", "Power feed path"),
      node(electricalSource, "GROUND_RETURN", "FUNCTION", "Ground return path"),
      node(electricalSource, "LOAD_DEVICE", "FUNCTION", "Load device or actuator"),
      node(electricalSource, "CONTROL_COMMAND", "FUNCTION", "Control command or enable"),
      node(electricalSource, "OPEN_CIRCUIT", "FAILURE_MODE", "Open circuit or excessive resistance"),
      node(electricalSource, "SHORT_TO_POWER_OR_GROUND", "FAILURE_MODE", "Short to power or ground"),
      node(electricalSource, "VOLTAGE_DROP_FAULT", "FAILURE_MODE", "Voltage drop under load"),
      node(electricalSource, "ELECTRICAL_VISUAL_SAFE_STATE", "TEST", "Electrical safe-state and visual inspection"),
      node(electricalSource, "ELECTRICAL_VOLTAGE_DROP_TEST", "TEST", "Circuit voltage-drop test"),
      node(electricalSource, "ELECTRICAL_CONTINUITY_ISOLATION_TEST", "TEST", "Continuity and isolation test"),
      node(electricalSource, "ELECTRICAL_ESCALATION", "ESCALATION", "Electrical safety or source escalation")
    ],
    edges: [
      edge(electricalSource, "ELECTRICAL_CIRCUIT_SYSTEM", "POWER_FEED", "CONTAINS"),
      edge(electricalSource, "ELECTRICAL_CIRCUIT_SYSTEM", "GROUND_RETURN", "CONTAINS"),
      edge(electricalSource, "ELECTRICAL_CIRCUIT_SYSTEM", "LOAD_DEVICE", "CONTAINS"),
      edge(electricalSource, "ELECTRICAL_CIRCUIT_SYSTEM", "CONTROL_COMMAND", "CONTAINS"),
      edge(electricalSource, "POWER_FEED", "OPEN_CIRCUIT", "CAN_FAIL_AS"),
      edge(electricalSource, "GROUND_RETURN", "VOLTAGE_DROP_FAULT", "CAN_FAIL_AS"),
      edge(electricalSource, "LOAD_DEVICE", "SHORT_TO_POWER_OR_GROUND", "CAN_FAIL_AS"),
      edge(electricalSource, "OPEN_CIRCUIT", "ELECTRICAL_CONTINUITY_ISOLATION_TEST", "DETECTED_BY"),
      edge(electricalSource, "VOLTAGE_DROP_FAULT", "ELECTRICAL_VOLTAGE_DROP_TEST", "DETECTED_BY"),
      edge(electricalSource, "ELECTRICAL_CIRCUIT_SYSTEM", "ELECTRICAL_VISUAL_SAFE_STATE", "DETECTED_BY"),
      edge(electricalSource, "ELECTRICAL_CIRCUIT_SYSTEM", "ELECTRICAL_ESCALATION", "ESCALATES_TO")
    ],
    rules: [
      { key: "ELECTRICAL_RULE_SAFE_STATE_FIRST", precedence: 1, effect: "STOP_OR_ESCALATE", when: "UNCONTROLLED_ENERGY_OR_PYROTECHNIC_CIRCUIT_PRESENT" },
      { key: "ELECTRICAL_RULE_LOAD_MEASUREMENT_REQUIRED", precedence: 2, effect: "REQUIRE_AFFIRMATIVE_EVIDENCE", when: "CIRCUIT_REPAIR_OR_COMPONENT_REPLACEMENT_CONSIDERED" },
      { key: "ELECTRICAL_RULE_NO_DTC_TO_WIRE", precedence: 3, effect: "RETAIN_ALTERNATIVES", when: "CODE_OR_SYMPTOM_ONLY_SUPPORTS_CIRCUIT_DECISION" }
    ],
    tests: [
      { definitionKey: "ELECTRICAL_SAFE_STATE_VISUAL_INSPECTION", name: "Electrical safe-state and visual inspection", purpose: "Confirm safe state, circuit accessibility, fuse/connector condition, and visible damage before powered measurement.", riskTier: "R2", tools: ["DVOM_CAT_III", "INSPECTION_LIGHT"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "BATTERY_SAFE_ACCESS_CONFIRMED"], hazards: ["ELECTRICAL_SHORT_ARC", "BATTERY_ENERGY"], procedure: [{ code: "CONFIRM_SAFE_STATE", instruction: "Confirm battery, ignition, and circuit safe state before access." }, { code: "DOCUMENT_VISIBLE_CONDITION", instruction: "Record connector, fuse, terminal, corrosion, and harness observations." }], requiredEvidence: [{ code: "ELECTRICAL_VISUAL_CONDITION", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 12 },
      { definitionKey: "ELECTRICAL_VOLTAGE_DROP_UNDER_LOAD", name: "Electrical voltage drop under load", purpose: "Measure power and ground voltage drop under a controlled load without replacing components from static voltage alone.", riskTier: "R2", tools: ["DVOM_CAT_III", "LOAD_TOOL"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "CIRCUIT_LOAD_SAFE_STATE"], hazards: ["ELECTRICAL_SHORT_ARC", "ROTATING_COMPONENTS"], procedure: [{ code: "CONNECT_METER_SAFELY", instruction: "Connect approved meter leads and fused adapters." }, { code: "CAPTURE_LOAD_DROP", instruction: "Record voltage drop while the circuit is operating under controlled load." }], requiredEvidence: [{ code: "VOLTAGE_DROP_MEASUREMENT", type: "MEASUREMENT", quantity: "VOLTAGE", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 18 },
      { definitionKey: "ELECTRICAL_CONTINUITY_ISOLATION_CHECK", name: "Electrical continuity and isolation check", purpose: "Check continuity and isolation only after the circuit is safely de-energized and disconnected per approved procedure.", riskTier: "R2", tools: ["DVOM_CAT_III", "FUSED_JUMPER_SET"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "CIRCUIT_DEENERGIZED_CONFIRMED"], hazards: ["ELECTRICAL_SHORT_ARC"], procedure: [{ code: "CONFIRM_DEENERGIZED", instruction: "Confirm the circuit is safely de-energized and isolated." }, { code: "CAPTURE_CONTINUITY_ISOLATION", instruction: "Record continuity, resistance, and isolation observations with connector state." }], requiredEvidence: [{ code: "CONTINUITY_ISOLATION_MEASUREMENT", type: "MEASUREMENT", quantity: "RESISTANCE", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 20 }
    ]
  },
  {
    key: "WAVEFORM_ANALYSIS",
    sourceKey: waveformSource,
    ruleSetKey: "WAVEFORM_ANALYSIS_FOUNDATION",
    domain: "WAVEFORM_ANALYSIS",
    purpose: "Generic waveform and scope-capture topology for signal integrity, timing, amplitude, duty, and transducer patterns without vehicle-specific known-good libraries or automated component condemnation.",
    excludes: ["UNLICENSED_KNOWN_GOOD_WAVEFORM_LIBRARY", "AIRBAG_OR_PYROTECHNIC_CIRCUIT_PROBING", "HIGH_VOLTAGE_LIVE_WORK", "MODULE_PROGRAMMING", "UNLICENSED_VEHICLE_SPECIFIC_THRESHOLD"],
    qualification: "WAVEFORM_DIAGNOSIS_L2",
    baseHazards: ["ELECTRICAL_SHORT_ARC", "ROTATING_COMPONENTS", "HOT_EXHAUST"],
    nodes: [
      node(waveformSource, "WAVEFORM_SYSTEM", "SYSTEM", "Waveform acquisition and analysis system"),
      node(waveformSource, "SIGNAL_AMPLITUDE", "FUNCTION", "Signal amplitude and offset"),
      node(waveformSource, "SIGNAL_TIMING", "FUNCTION", "Signal timing and phase"),
      node(waveformSource, "SIGNAL_PATTERN", "FUNCTION", "Repeated pattern and duty cycle"),
      node(waveformSource, "TRANSDUCER_CAPTURE", "FUNCTION", "Pressure, current, or vibration transducer capture"),
      node(waveformSource, "SIGNAL_INTEGRITY_FAULT", "FAILURE_MODE", "Signal integrity or noise fault"),
      node(waveformSource, "TIMING_CORRELATION_FAULT", "FAILURE_MODE", "Timing or phase correlation fault"),
      node(waveformSource, "PATTERN_DEVIATION", "FAILURE_MODE", "Pattern deviation requiring review"),
      node(waveformSource, "WAVEFORM_SETUP_CAPTURE", "TEST", "Scope setup and capture"),
      node(waveformSource, "WAVEFORM_TIMING_CORRELATION", "TEST", "Timing correlation capture"),
      node(waveformSource, "WAVEFORM_TRANSDUCER_COMPARISON", "TEST", "Transducer comparison capture"),
      node(waveformSource, "WAVEFORM_ESCALATION", "ESCALATION", "Waveform interpretation escalation")
    ],
    edges: [
      edge(waveformSource, "WAVEFORM_SYSTEM", "SIGNAL_AMPLITUDE", "CONTAINS"),
      edge(waveformSource, "WAVEFORM_SYSTEM", "SIGNAL_TIMING", "CONTAINS"),
      edge(waveformSource, "WAVEFORM_SYSTEM", "SIGNAL_PATTERN", "CONTAINS"),
      edge(waveformSource, "WAVEFORM_SYSTEM", "TRANSDUCER_CAPTURE", "CONTAINS"),
      edge(waveformSource, "SIGNAL_AMPLITUDE", "SIGNAL_INTEGRITY_FAULT", "CAN_FAIL_AS"),
      edge(waveformSource, "SIGNAL_TIMING", "TIMING_CORRELATION_FAULT", "CAN_FAIL_AS"),
      edge(waveformSource, "SIGNAL_PATTERN", "PATTERN_DEVIATION", "CAN_FAIL_AS"),
      edge(waveformSource, "SIGNAL_INTEGRITY_FAULT", "WAVEFORM_SETUP_CAPTURE", "DETECTED_BY"),
      edge(waveformSource, "TIMING_CORRELATION_FAULT", "WAVEFORM_TIMING_CORRELATION", "DETECTED_BY"),
      edge(waveformSource, "PATTERN_DEVIATION", "WAVEFORM_TRANSDUCER_COMPARISON", "DETECTED_BY"),
      edge(waveformSource, "WAVEFORM_SYSTEM", "WAVEFORM_ESCALATION", "ESCALATES_TO")
    ],
    rules: [
      { key: "WAVEFORM_RULE_SETUP_BEFORE_INTERPRETATION", precedence: 1, effect: "REQUIRE_AFFIRMATIVE_EVIDENCE", when: "WAVEFORM_INTERPRETATION_REQUESTED" },
      { key: "WAVEFORM_RULE_NO_KNOWN_GOOD_INVENTION", precedence: 2, effect: "STOP_OR_ESCALATE", when: "KNOWN_GOOD_REFERENCE_NOT_AUTHORIZED" },
      { key: "WAVEFORM_RULE_PATTERN_NOT_PART", precedence: 3, effect: "RETAIN_ALTERNATIVES", when: "PATTERN_ONLY_SUPPORTS_COMPONENT_REPLACEMENT" }
    ],
    tests: [
      { definitionKey: "WAVEFORM_SCOPE_SETUP_CAPTURE", name: "Waveform scope setup and capture", purpose: "Capture signal waveform with channel setup, scaling, coupling, timebase, trigger, and probe context.", riskTier: "R2", tools: ["OSCILLOSCOPE", "BACKPROBE_OR_BREAKOUT_LEADS"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "PROBE_CONNECTION_SAFE_STATE"], hazards: ["ELECTRICAL_SHORT_ARC", "ROTATING_COMPONENTS"], procedure: [{ code: "DOCUMENT_SCOPE_SETUP", instruction: "Record channel scaling, coupling, probe, trigger, and timebase." }, { code: "CAPTURE_WAVEFORM", instruction: "Capture waveform evidence with operating-state context." }], requiredEvidence: [{ code: "WAVEFORM_CAPTURE", type: "ARTIFACT", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 18 },
      { definitionKey: "WAVEFORM_TIMING_CORRELATION_CAPTURE", name: "Waveform timing correlation capture", purpose: "Capture synchronized timing signals without interpreting against unauthorized vehicle-specific references.", riskTier: "R2", tools: ["OSCILLOSCOPE", "SYNC_PROBE"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "ROTATING_COMPONENT_CLEARANCE_CONFIRMED"], hazards: ["ROTATING_COMPONENTS", "ELECTRICAL_SHORT_ARC"], procedure: [{ code: "CAPTURE_SYNC_SIGNALS", instruction: "Capture synchronized channels and timing markers." }, { code: "PRESERVE_REFERENCE_LIMITS", instruction: "Record that vehicle-specific known-good references are required for final interpretation." }], requiredEvidence: [{ code: "TIMING_CORRELATION_CAPTURE", type: "ARTIFACT", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 22 },
      { definitionKey: "WAVEFORM_TRANSDUCER_COMPARISON_CAPTURE", name: "Waveform transducer comparison capture", purpose: "Capture pressure, current, or vibration transducer evidence for comparison without authorizing teardown.", riskTier: "R2", tools: ["OSCILLOSCOPE", "TRANSDUCER"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "TRANSDUCER_SAFE_SETUP"], hazards: ["HOT_EXHAUST", "ROTATING_COMPONENTS"], procedure: [{ code: "CONFIRM_TRANSDUCER_SETUP", instruction: "Confirm transducer type, location, scaling, and safe routing." }, { code: "CAPTURE_PATTERN", instruction: "Record pattern artifact and operating condition." }], requiredEvidence: [{ code: "TRANSDUCER_WAVEFORM_CAPTURE", type: "ARTIFACT", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 24 }
    ]
  },
  {
    key: "INTERMITTENT_FAULT",
    sourceKey: intermittentSource,
    ruleSetKey: "INTERMITTENT_FAULT_FOUNDATION",
    domain: "INTERMITTENT_FAULT_INVESTIGATION",
    purpose: "Generic intermittent fault topology for reproduction planning, temporal capture, trigger correlation, and no-fault-found discipline without uncontrolled road tests or invasive harness damage.",
    excludes: ["UNCONTROLLED_ROAD_TEST", "CUSTOMER_UNAPPROVED_EXTENDED_MONITORING", "HARNESS_DAMAGE_INDUCEMENT", "MODULE_PROGRAMMING", "UNLICENSED_VEHICLE_SPECIFIC_THRESHOLD"],
    qualification: "INTERMITTENT_DIAGNOSIS_L2",
    baseHazards: ["ROAD_TEST_RISK", "MOVING_COMPONENTS", "BATTERY_ENERGY"],
    nodes: [
      node(intermittentSource, "INTERMITTENT_SYSTEM", "SYSTEM", "Intermittent fault investigation system"),
      node(intermittentSource, "TRIGGER_CONDITION", "FUNCTION", "Trigger or enabling condition"),
      node(intermittentSource, "TEMPORAL_CAPTURE", "FUNCTION", "Temporal data capture"),
      node(intermittentSource, "NONDTECTION_DISCIPLINE", "FUNCTION", "Nondetection and no-fault-found discipline"),
      node(intermittentSource, "CONNECTOR_OR_HARNESS_INTERMITTENT", "FAILURE_MODE", "Connector or harness intermittent fault"),
      node(intermittentSource, "THERMAL_OR_VIBRATION_INTERMITTENT", "FAILURE_MODE", "Thermal or vibration intermittent fault"),
      node(intermittentSource, "CONTROL_STATE_INTERMITTENT", "FAILURE_MODE", "Control state or software-observed intermittent"),
      node(intermittentSource, "INTERMITTENT_REPRODUCTION_PLAN", "TEST", "Intermittent reproduction plan"),
      node(intermittentSource, "INTERMITTENT_TRIGGER_CAPTURE", "TEST", "Trigger capture"),
      node(intermittentSource, "INTERMITTENT_WIGGLE_THERMAL_SCREEN", "TEST", "Controlled wiggle or thermal screen"),
      node(intermittentSource, "INTERMITTENT_ESCALATION", "ESCALATION", "Intermittent investigation escalation")
    ],
    edges: [
      edge(intermittentSource, "INTERMITTENT_SYSTEM", "TRIGGER_CONDITION", "CONTAINS"),
      edge(intermittentSource, "INTERMITTENT_SYSTEM", "TEMPORAL_CAPTURE", "CONTAINS"),
      edge(intermittentSource, "INTERMITTENT_SYSTEM", "NONDTECTION_DISCIPLINE", "CONTAINS"),
      edge(intermittentSource, "TRIGGER_CONDITION", "THERMAL_OR_VIBRATION_INTERMITTENT", "CAN_FAIL_AS"),
      edge(intermittentSource, "TEMPORAL_CAPTURE", "CONTROL_STATE_INTERMITTENT", "CAN_FAIL_AS"),
      edge(intermittentSource, "NONDTECTION_DISCIPLINE", "CONNECTOR_OR_HARNESS_INTERMITTENT", "CAN_FAIL_AS"),
      edge(intermittentSource, "THERMAL_OR_VIBRATION_INTERMITTENT", "INTERMITTENT_TRIGGER_CAPTURE", "DETECTED_BY"),
      edge(intermittentSource, "CONNECTOR_OR_HARNESS_INTERMITTENT", "INTERMITTENT_WIGGLE_THERMAL_SCREEN", "DETECTED_BY"),
      edge(intermittentSource, "INTERMITTENT_SYSTEM", "INTERMITTENT_REPRODUCTION_PLAN", "DETECTED_BY"),
      edge(intermittentSource, "INTERMITTENT_SYSTEM", "INTERMITTENT_ESCALATION", "ESCALATES_TO")
    ],
    rules: [
      { key: "INTERMITTENT_RULE_REPRODUCTION_PLAN_FIRST", precedence: 1, effect: "REQUIRE_AFFIRMATIVE_EVIDENCE", when: "INTERMITTENT_INVESTIGATION_STARTED" },
      { key: "INTERMITTENT_RULE_NO_DAMAGE_INDUCTION", precedence: 2, effect: "STOP_OR_ESCALATE", when: "TEST_METHOD_COULD_DAMAGE_HARNESS_OR_MODULE" },
      { key: "INTERMITTENT_RULE_NO_FAULT_FOUND_DISCIPLINE", precedence: 3, effect: "RETAIN_ALTERNATIVES", when: "CONCERN_NOT_REPRODUCED" }
    ],
    tests: [
      { definitionKey: "INTERMITTENT_REPRODUCTION_PLAN", name: "Intermittent reproduction plan", purpose: "Document symptom, trigger hypotheses, safe reproduction boundary, capture strategy, and stop criteria before testing.", riskTier: "R1", tools: ["SCAN_TOOL", "CASE_NOTES"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED"], hazards: ["ROAD_TEST_RISK"], procedure: [{ code: "DEFINE_TRIGGER_HYPOTHESES", instruction: "List temperature, vibration, load, time, moisture, and state triggers." }, { code: "SET_STOP_CRITERIA", instruction: "Document safety and customer-authorization stop criteria." }], requiredEvidence: [{ code: "REPRODUCTION_PLAN", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 14 },
      { definitionKey: "INTERMITTENT_TRIGGER_DATA_CAPTURE", name: "Intermittent trigger data capture", purpose: "Capture time-correlated scan, measurement, or artifact evidence around symptom trigger and recovery.", riskTier: "R2", tools: ["SCAN_TOOL", "DATA_LOGGER"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "CAPTURE_WINDOW_DEFINED"], hazards: ["ROAD_TEST_RISK", "MOVING_COMPONENTS"], procedure: [{ code: "ARM_CAPTURE", instruction: "Arm logger or scope with trigger and timestamp context." }, { code: "PRESERVE_EVENT_WINDOW", instruction: "Preserve pre-event, event, and post-event evidence." }], requiredEvidence: [{ code: "TRIGGER_CAPTURE", type: "ARTIFACT", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 30 },
      { definitionKey: "INTERMITTENT_CONTROLLED_WIGGLE_THERMAL_SCREEN", name: "Controlled wiggle or thermal screen", purpose: "Screen connector, harness, temperature, or vibration sensitivity without inducing damage or unsafe operation.", riskTier: "R2", tools: ["SCAN_TOOL", "THERMAL_MEASUREMENT_TOOL"], prerequisites: ["VEHICLE_IDENTITY_CONFIRMED", "SOURCE_APPLICABILITY_CONFIRMED", "HARNESS_ACCESS_SAFE_STATE"], hazards: ["MOVING_COMPONENTS", "BATTERY_ENERGY"], procedure: [{ code: "CONFIRM_NON_DESTRUCTIVE_METHOD", instruction: "Confirm the screen will not strain, pierce, overheat, or damage wiring." }, { code: "CAPTURE_RESPONSE", instruction: "Record response, trigger, and recovery evidence." }], requiredEvidence: [{ code: "CONTROLLED_TRIGGER_RESPONSE", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 24 }
    ]
  }
];

function packageFor(seed: FamilySeed, governance: Phase8ElectricalFoundationGovernance, now: Date) {
  return normalizeDiagnosticKnowledgePackage({
    contractVersion: "PHASE-8/1.0.0",
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
    sourceCitations: [{ sourceKey: seed.sourceKey, purpose: `${seed.domain} generic engineering topology, safety precedence, and measurement-first test semantics.`, locator: { documents: ["ELECTRICAL_AND_WAVEFORM_DIAGNOSTICS", "INTERMITTENT_FAULT_INVESTIGATION", "DGN-004"], sections: ["Phase 8 coverage expansion", "SRC-ENGINEERING"] } }],
    sources: [{
      sourceKey: seed.sourceKey,
      version: 1,
      rightsStatus: governance.rightsStatus,
      sourceClass: "ENGINEERING",
      ownerName: "Dispatch Board Diagnostics",
      sourceReference: `${seed.domain} generic engineering model governed by DGN-004 source policy`,
      revision: PHASE_8_ELECTRICAL_WAVEFORM_INTERMITTENT_FOUNDATIONS_VERSION,
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

function definitionsFor(seed: FamilySeed, governance: Phase8ElectricalFoundationGovernance, now: Date) {
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
    sourceVersions: [{ sourceId: seed.sourceKey, version: PHASE_8_ELECTRICAL_WAVEFORM_INTERMITTENT_FOUNDATIONS_VERSION, rightsStatus: "AUTHORIZED", validUntil: null }],
    idempotencyKey: `PHASE-8-${seed.key}-SEED`,
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

export function createControlledPhase8ElectricalKnowledgePackages(governance: Phase8ElectricalFoundationGovernance, now = new Date()) {
  return Object.fromEntries(seeds.map((seed) => [seed.key, packageFor(seed, governance, now)])) as Record<Phase8ElectricalFamilyKey, ReturnType<typeof packageFor>>;
}

export function createControlledPhase8ElectricalTestDefinitions(governance: Phase8ElectricalFoundationGovernance, now = new Date()) {
  return Object.fromEntries(seeds.map((seed) => [seed.key, definitionsFor(seed, governance, now)])) as Record<Phase8ElectricalFamilyKey, ReturnType<typeof definitionsFor>>;
}
