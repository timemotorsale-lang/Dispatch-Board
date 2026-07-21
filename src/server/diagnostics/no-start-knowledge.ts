import { normalizeDiagnosticKnowledgePackage, type DiagnosticKnowledgePackage, type DiagnosticKnowledgeRights, type DiagnosticReleaseState } from "./knowledge-domain";
import { normalizeDiagnosticTestDefinition } from "./test-execution-domain";

export const NO_START_KNOWLEDGE_VERSION = "DGN-020/NO-START/1.0.0";

const sourceKey = "DGN-SRC-005";
const nodes: DiagnosticKnowledgePackage["nodes"] = [
  { key: "STARTING_SYSTEM", kind: "SYSTEM", label: "Starting and charging system", sourceKeys: [sourceKey] },
  { key: "START_REQUEST", kind: "FUNCTION", label: "Start request received", sourceKeys: [sourceKey] },
  { key: "CONTROL_INTERLOCKS", kind: "FUNCTION", label: "Configured control interlocks satisfied", sourceKeys: [sourceKey] },
  { key: "ENERGY_AVAILABLE", kind: "FUNCTION", label: "Electrical energy available under load", sourceKeys: [sourceKey] },
  { key: "STARTER_COMMAND", kind: "FUNCTION", label: "Starter control command delivered", sourceKeys: [sourceKey] },
  { key: "STARTER_CURRENT_PATH", kind: "PATH", label: "Starter positive and ground current path", sourceKeys: [sourceKey] },
  { key: "MECHANICAL_ROTATION", kind: "FUNCTION", label: "Mechanical rotation achieved", sourceKeys: [sourceKey] },
  { key: "MODULES_AWAKE_SYNCHRONIZED", kind: "FUNCTION", label: "Required modules awake and synchronized", sourceKeys: [sourceKey] },
  { key: "COMBUSTION_REQUIREMENTS", kind: "FUNCTION", label: "Air, fuel, ignition, compression, and timing available", sourceKeys: [sourceKey] },
  { key: "COMBUSTION_SUSTAINED", kind: "FUNCTION", label: "Combustion sustained", sourceKeys: [sourceKey] },
  { key: "CHARGING_VERIFIED", kind: "VERIFICATION", label: "Charging and energy recovery verified", sourceKeys: [sourceKey] },
  { key: "BATTERY", kind: "COMPONENT", label: "Low-voltage battery", sourceKeys: [sourceKey] },
  { key: "STARTER", kind: "COMPONENT", label: "Starter and solenoid", sourceKeys: [sourceKey] },
  { key: "HIGH_RESISTANCE_PATH", kind: "FAILURE_MODE", label: "Open or high-resistance current path", sourceKeys: [sourceKey] },
  { key: "INSUFFICIENT_LOADED_CAPACITY", kind: "FAILURE_MODE", label: "Insufficient energy capacity under load", sourceKeys: [sourceKey] },
  { key: "EXCESSIVE_MECHANICAL_LOAD", kind: "FAILURE_MODE", label: "Excessive mechanical load or binding", sourceKeys: [sourceKey] },
  { key: "LOADED_VOLTAGE_TEST", kind: "TEST", label: "Loaded source voltage measurement", sourceKeys: [sourceKey] },
  { key: "LOADED_PATH_DROP_TEST", kind: "TEST", label: "Loaded positive and ground path voltage-drop measurement", sourceKeys: [sourceKey] },
  { key: "STARTER_CURRENT_SPEED_TEST", kind: "TEST", label: "Starter current and rotational-speed relationship", sourceKeys: [sourceKey] },
  { key: "SECURITY_ESCALATION", kind: "ESCALATION", label: "Authenticated security-state escalation; no bypass", sourceKeys: [sourceKey] }
];

const edge = (from: string, to: string, kind: DiagnosticKnowledgePackage["edges"][number]["kind"]) => ({ from, to, kind, sourceKeys: [sourceKey] });
const edges: DiagnosticKnowledgePackage["edges"] = [
  edge("STARTING_SYSTEM", "START_REQUEST", "CONTAINS"), edge("START_REQUEST", "CONTROL_INTERLOCKS", "ENABLES"),
  edge("CONTROL_INTERLOCKS", "ENERGY_AVAILABLE", "ENABLES"), edge("ENERGY_AVAILABLE", "STARTER_COMMAND", "ENABLES"),
  edge("STARTER_COMMAND", "STARTER_CURRENT_PATH", "ENABLES"), edge("STARTER_CURRENT_PATH", "MECHANICAL_ROTATION", "ENABLES"),
  edge("MECHANICAL_ROTATION", "MODULES_AWAKE_SYNCHRONIZED", "ENABLES"), edge("MODULES_AWAKE_SYNCHRONIZED", "COMBUSTION_REQUIREMENTS", "ENABLES"),
  edge("COMBUSTION_REQUIREMENTS", "COMBUSTION_SUSTAINED", "ENABLES"), edge("COMBUSTION_SUSTAINED", "CHARGING_VERIFIED", "VERIFIED_BY"),
  edge("ENERGY_AVAILABLE", "BATTERY", "DEPENDS_ON"), edge("STARTER_CURRENT_PATH", "STARTER", "DEPENDS_ON"),
  edge("STARTER_CURRENT_PATH", "HIGH_RESISTANCE_PATH", "CAN_FAIL_AS"), edge("ENERGY_AVAILABLE", "INSUFFICIENT_LOADED_CAPACITY", "CAN_FAIL_AS"),
  edge("MECHANICAL_ROTATION", "EXCESSIVE_MECHANICAL_LOAD", "CAN_FAIL_AS"), edge("INSUFFICIENT_LOADED_CAPACITY", "LOADED_VOLTAGE_TEST", "DETECTED_BY"),
  edge("HIGH_RESISTANCE_PATH", "LOADED_PATH_DROP_TEST", "DETECTED_BY"), edge("EXCESSIVE_MECHANICAL_LOAD", "STARTER_CURRENT_SPEED_TEST", "DETECTED_BY"),
  edge("CONTROL_INTERLOCKS", "SECURITY_ESCALATION", "ESCALATES_TO")
];

export type NoStartKnowledgeGovernance = {
  organizationId?: string; authoredByUserId: string; technicalReviewedByUserId: string | null; rightsReviewedByUserId: string | null;
  ruleSetReviewedByUserId: string | null; approvedAt: string | null; effectiveAt: string; retrievedAt: string;
  rightsStatus: DiagnosticKnowledgeRights; releaseState: DiagnosticReleaseState;
};

export function createControlledNoStartKnowledgePackage(governance: NoStartKnowledgeGovernance, now = new Date()) {
  return normalizeDiagnosticKnowledgePackage({
    contractVersion: "DGN-020/1.0.0", ruleSetKey: "STARTING_CHARGING_NO_START", version: 1, releaseState: governance.releaseState,
    purpose: "Generic, measurement-first starting/charging/no-start functional topology without vehicle-specific thresholds or licensed OEM procedures.",
    applicability: { domain: "LOW_VOLTAGE_STARTING_CHARGING", excludes: ["HIGH_VOLTAGE_PROPULSION", "SECURITY_BYPASS", "UNLICENSED_VEHICLE_SPECIFIC_PROCEDURE"], vehicleSpecific: false },
    nodes: structuredClone(nodes), edges: structuredClone(edges),
    rules: [
      { key: "NS_RULE_SAFETY_PRECEDENCE", precedence: 1, effect: "STOP_OR_ESCALATE", when: "UNCONTROLLED_HAZARD" },
      { key: "NS_RULE_APPLICABILITY_REQUIRED", precedence: 2, effect: "ABSTAIN", when: "VEHICLE_OR_SOURCE_APPLICABILITY_UNKNOWN" },
      { key: "NS_RULE_MEASUREMENT_VALIDITY", precedence: 3, effect: "BLOCK_DEPENDENT_INFERENCE", when: "MEASUREMENT_INVALID_OR_SETUP_UNVERIFIED" },
      { key: "NS_RULE_NO_DTC_TO_PART", precedence: 4, effect: "RETAIN_ALTERNATIVES", when: "ONLY_CODE_OR_COMMON_FIX_SUPPORTS_COMPONENT" },
      { key: "NS_RULE_CONFIRMATION", precedence: 5, effect: "REQUIRE_AFFIRMATIVE_EVIDENCE", when: "CAUSE_CONFIRMATION_REQUESTED" }
    ],
    testDefinitionKeys: ["NS_LOADED_SOURCE_VOLTAGE", "NS_LOADED_PATH_VOLTAGE_DROP", "NS_STARTER_CURRENT_SPEED", "NS_POST_REPAIR_CHARGING"],
    calculationVersions: ["DGN-021/1.0.0"],
    sourceCitations: [{ sourceKey, purpose: "Generic functional topology, engineering relationships, safety precedence, and measurement-first test semantics.", locator: { documents: ["DGN-003", "DGN-004"], sections: ["Functional ontology", "Confirmation boundary", "SRC-ENGINEERING"] } }],
    sources: [{
      sourceKey, version: 1, rightsStatus: governance.rightsStatus, sourceClass: "ENGINEERING", ownerName: "Dispatch Board Diagnostics",
      sourceReference: "DGN-003 ontology plus DGN-004 engineering-source governance", revision: NO_START_KNOWLEDGE_VERSION,
      usageRights: { access: true, store: true, display: true, transform: true, derive: true, export: false, trainExternalModel: false },
      applicability: { genericEngineeringOnly: true, vehicleSpecificThresholds: false }, retrievedAt: governance.retrievedAt, effectiveAt: governance.effectiveAt,
      expiresAt: null, withdrawnAt: null, withdrawalReasonCode: null, authoredByUserId: governance.authoredByUserId,
      technicalReviewedByUserId: governance.technicalReviewedByUserId, rightsReviewedByUserId: governance.rightsReviewedByUserId,
      approvedAt: governance.approvedAt, supersedesId: null
    }],
    authoredByUserId: governance.authoredByUserId, reviewedByUserId: governance.ruleSetReviewedByUserId, approvedAt: governance.approvedAt,
    effectiveAt: governance.effectiveAt, expiresAt: null, supersedesId: null, rollbackPredecessorId: null
  }, now);
}

export function createControlledNoStartTestDefinitions(governance: NoStartKnowledgeGovernance, now = new Date()) {
  if (governance.rightsStatus !== "AUTHORIZED") throw new Error("No-start test definitions require an authorized engineering source.");
  const sourceVersions = [{ sourceId: sourceKey, version: NO_START_KNOWLEDGE_VERSION, rightsStatus: "AUTHORIZED", validUntil: null }];
  const common = {
    expectedVersion: 0, definitionVersion: 1, effectiveAt: governance.effectiveAt, expiresAt: null, estimatedCostDecimal: null,
    riskTier: "R2", ontologyLinks: ["STARTING_SYSTEM"], applicability: { genericEngineeringOnly: true, excludes: ["HIGH_VOLTAGE_PROPULSION", "SECURITY_BYPASS"], requiresVehicleSpecificLimitsWhenInterpreting: true },
    qualifications: [{ code: "ELECTRICAL_L2" }], hazards: [{ code: "ROTATING_COMPONENTS" }, { code: "ELECTRICAL_SHORT_ARC" }],
    prerequisites: [{ code: "VEHICLE_IDENTITY_CONFIRMED" }, { code: "SOURCE_APPLICABILITY_CONFIRMED" }, { code: "INSTRUMENT_SETUP_VERIFIED" }],
    tools: [{ code: "CALIBRATED_DVOM" }], vehicleState: { technicianMustConfirmExactState: true }, branches: [], interpretations: [], sourceVersions,
    idempotencyKey: "DGN-020-NO-START-SEED", reason: "Release the independently reviewed generic no-start test definition seed."
  };
  const definitions = [
    {
      definitionKey: "NS_LOADED_SOURCE_VOLTAGE", name: "Loaded source voltage", purpose: "Capture source voltage under a documented starting load without applying a universal vehicle threshold.",
      procedure: [{ code: "CONFIRM_STATE", instruction: "Confirm vehicle identity, approved source limits, instrument setup, and exact initial state." }, { code: "CAPTURE_LOADED_VOLTAGE", instruction: "Capture source voltage and load conditions during the authorized starting attempt." }, { code: "PRESERVE_RAW_RESULT", instruction: "Preserve the raw reading, timing, instrument, setup, and operating conditions." }],
      requiredEvidence: [{ code: "LOADED_SOURCE_VOLTAGE", type: "MEASUREMENT", quantity: "VOLTAGE", normalizedUnit: "V", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 8
    },
    {
      definitionKey: "NS_LOADED_PATH_VOLTAGE_DROP", name: "Loaded starting-path voltage drop", purpose: "Measure positive and ground path loss under load and preserve segment/setup context.",
      procedure: [{ code: "CONFIRM_SAFE_CONNECTION", instruction: "Confirm safe probe connection, reference point, polarity, and authorized crank duration." }, { code: "CAPTURE_POSITIVE_PATH", instruction: "Capture positive-path voltage drop under the documented load." }, { code: "CAPTURE_GROUND_PATH", instruction: "Capture ground-path voltage drop under the same documented state." }],
      requiredEvidence: [{ code: "POSITIVE_PATH_DROP", type: "MEASUREMENT", quantity: "VOLTAGE", normalizedUnit: "V", minimumCount: 1, minimumIndependentGroups: 1 }, { code: "GROUND_PATH_DROP", type: "MEASUREMENT", quantity: "VOLTAGE", normalizedUnit: "V", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 12
    },
    {
      definitionKey: "NS_STARTER_CURRENT_SPEED", name: "Starter current and speed relationship", purpose: "Capture synchronized starter current and engine speed for consistency evaluation without autonomously condemning a component.",
      tools: [{ code: "CALIBRATED_CURRENT_PROBE" }, { code: "ENGINE_SPEED_SOURCE" }],
      procedure: [{ code: "CONFIRM_CRANK_LIMIT", instruction: "Confirm authorized crank-duration and repeated-attempt limits before testing." }, { code: "CAPTURE_SYNCHRONIZED", instruction: "Capture current, voltage, engine speed, and exact timing in one documented operating window." }, { code: "STOP_ON_HAZARD", instruction: "Stop immediately for excessive heat, smoke, leakage, binding, or other uncontrolled hazard." }],
      requiredEvidence: [{ code: "STARTER_CURRENT", type: "MEASUREMENT", quantity: "CURRENT", normalizedUnit: "A", minimumCount: 1, minimumIndependentGroups: 1 }, { code: "ENGINE_SPEED", type: "MEASUREMENT", quantity: "SPEED", normalizedUnit: "rpm", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 15
    },
    {
      definitionKey: "NS_POST_REPAIR_CHARGING", name: "Post-repair charging and recurrence verification", purpose: "Verify concern resolution, energy recovery, and charging behavior after an authorized repair.",
      procedure: [{ code: "REPRODUCE_CONCERN_CHECK", instruction: "Repeat the approved concern-specific verification under documented conditions." }, { code: "CAPTURE_CHARGING_STATE", instruction: "Capture charging voltage/current/state using applicable source limits." }, { code: "CHECK_SECONDARY_CONCERN", instruction: "Record unresolved charging, draw, network, or recurrence indicators instead of closing them silently." }],
      requiredEvidence: [{ code: "VERIFIED_START", type: "OBSERVATION", minimumCount: 1, minimumIndependentGroups: 1 }, { code: "CHARGING_STATE", type: "MEASUREMENT", minimumCount: 1, minimumIndependentGroups: 1 }], estimatedMinutes: 15
    }
  ];
  return definitions.map((definition, index) => normalizeDiagnosticTestDefinition({ ...common, ...definition, idempotencyKey: `${common.idempotencyKey}-${index + 1}` }, now));
}
