import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const TECHNICIAN_TROUBLESHOOTING_CONSOLE_VERSION = "TTC/1.0.0";

export type TroubleshootingDomainId =
  | "ENGINE_DRIVABILITY"
  | "TRANSMISSION_DRIVETRAIN"
  | "BRAKE_ABS_STABILITY"
  | "STARTING_CHARGING"
  | "COOLING"
  | "HVAC"
  | "ELECTRICAL_NETWORK"
  | "BODY_COLLISION"
  | "ADAS_CALIBRATION";

export type TroubleshootingGateState =
  | "INTAKE_NEEDED"
  | "VEHICLE_INTELLIGENCE_NEEDED"
  | "EVIDENCE_NEEDED"
  | "TEST_RECOMMENDED"
  | "SUSPECTED_CAUSE_REVIEW";

export type TroubleshootingCaseInput = {
  generatedAt: string;
  diagnosticCase: {
    ageHours: number;
    assignedUser: { id: string; name: string } | null;
    concern: string;
    id: string;
    location: { code: string; id: string; name: string };
    measurements: Array<{ id: string; plausibilityStatus: string; qualityStatus: string; quantity: string; unit: string; value: string }>;
    observations: Array<{ id: string; qualityStatus: string; statement: string }>;
    repairOrder: { id: string; repairOrderNumber: string };
    riskTier: string;
    stage: string;
    status: string;
    testPlans?: Array<{
      id: string;
      nodes: Array<{
        id?: string;
        nodeKey: string;
        title: string;
        definition?: { tools?: unknown };
      }>;
      status?: string;
      version?: number;
    }>;
    vehicle: { id: string; label: string; make: string | null; model: string | null; vin: string | null; year: number | null };
    version: number;
  };
  qualitySafetyGates: {
    counts: { currentMeasurements: number; currentObservations: number; independentGroups: number; invalid: number; suspect: number };
    readyForReasoning: boolean;
    reasonCodes: string[];
  };
};

type DomainRulePack = {
  authority: "INTERNAL_SEED";
  commonCauses: Array<{ cause: string; evidenceNeeded: string[]; symptoms: string[] }>;
  domainFamily: "MECHANICAL" | "BODY" | "ELECTRICAL" | "ADAS";
  id: TroubleshootingDomainId;
  keywords: string[];
  label: string;
  missingQuestions: string[];
  symptomAliases: Record<string, string[]>;
  tests: Array<{ discriminates: string[]; expectedEvidence: string[]; key: string; prerequisites: string[]; reason: string; safety: string[]; title: string; tools: string[] }>;
};

type InternalKnownIssue = {
  applicability: { makes: string[]; yearMax: number | null; yearMin: number };
  domainId: TroubleshootingDomainId;
  evidenceRequired: string[];
  id: string;
  source: string;
  symptoms: string[];
  title: string;
};

const allowedOverrideReasons = new Set([
  "symptom currently present and another eligible test is more discriminating",
  "tool unavailable",
  "safer test first",
  "customer authorization limit",
  "already performed outside console",
  "master technician direction",
  "intermittent condition not reproducible",
  "vehicle condition prevents this test"
]);

const internalKnownIssueLibrary: InternalKnownIssue[] = [
  {
    id: "known-trans-fluid-leak-shift-quality",
    domainId: "TRANSMISSION_DRIVETRAIN" as const,
    title: "Transmission fluid condition or leak may affect shift quality",
    symptoms: ["slipping", "harsh shift", "leak"],
    applicability: { makes: [], yearMin: 1996, yearMax: null },
    evidenceRequired: ["fluid level", "fluid condition", "leak location", "scan data if electronically controlled"],
    source: "Internal seed library; not OEM service information."
  },
  {
    id: "known-engine-broad-scan-first",
    domainId: "ENGINE_DRIVABILITY" as const,
    title: "Broad engine complaints require scan/freeze-frame and symptom classification before repair direction",
    symptoms: ["warning light", "misfire", "no start"],
    applicability: { makes: [], yearMin: 1996, yearMax: null },
    evidenceRequired: ["DTC list", "freeze-frame data", "primary symptom"],
    source: "Internal seed library; not OEM service information."
  },
  {
    id: "known-brake-grind-friction-inspection",
    domainId: "BRAKE_ABS_STABILITY" as const,
    title: "Grinding brake noise requires friction and rotor inspection before estimate finalization",
    symptoms: ["noise"],
    applicability: { makes: [], yearMin: 1980, yearMax: null },
    evidenceRequired: ["pad thickness", "rotor condition", "hardware/caliper observation"],
    source: "Internal seed library; not OEM service information."
  },
  {
    id: "known-door-area-overlap",
    domainId: "BODY_COLLISION" as const,
    title: "Door concerns often cross body, trim, glass, latch, wiring, refinish, and calibration boundaries",
    symptoms: ["door repair", "window concern", "water leak", "damage"],
    applicability: { makes: [], yearMin: 1980, yearMax: null },
    evidenceRequired: ["affected subcomponent list", "damage/fitment observation", "photo if abnormal"],
    source: "Internal seed library; licensed diagrams and OEM part numbers not included."
  }
];

const broadConcernWords = new Set(["issue", "issues", "problem", "problems", "bad", "wrong", "concern", "noise", "noisy", "not working", "acting up"]);

const domainRulePacks: DomainRulePack[] = [
  {
    authority: "INTERNAL_SEED",
    domainFamily: "MECHANICAL",
    id: "ENGINE_DRIVABILITY",
    label: "Engine & Drivability",
    keywords: ["engine", "motor", "misfire", "rough", "stall", "power", "idle", "smoke", "oil", "check engine", "cel"],
    symptomAliases: {
      "no start": ["no start", "will not start", "cranks no start", "won't start"],
      misfire: ["misfire", "rough", "shaking", "missing", "runs bad"],
      overheating: ["overheat", "overheating", "runs hot", "hot"],
      leak: ["oil leak", "coolant leak", "leaking"],
      "warning light": ["check engine", "cel", "engine light"]
    },
    missingQuestions: ["Which engine symptom is present: no-start, misfire, noise, leak, overheating, power loss, smoke, stall, or warning light?", "When does it happen: cold start, hot soak, idle, acceleration, cruise, or under load?", "Are warning lights or scan codes present?"],
    commonCauses: [
      { cause: "Air/fuel/ignition imbalance", symptoms: ["misfire", "power loss", "rough idle"], evidenceNeeded: ["scan data", "fuel trim", "misfire counters", "spark/fuel/compression checks"] },
      { cause: "Cooling system performance fault", symptoms: ["overheating"], evidenceNeeded: ["coolant level", "pressure test", "fan command", "thermostat operation"] },
      { cause: "Sensor plausibility or control issue", symptoms: ["warning light", "stall", "power loss"], evidenceNeeded: ["DTCs", "freeze frame", "live data plausibility"] }
    ],
    tests: [
      { discriminates: ["sensor plausibility", "misfire", "control issue"], expectedEvidence: ["DTC list", "freeze-frame data", "live-data snapshot"], key: "ENGINE_SCAN_HEALTH", prerequisites: ["battery voltage stable", "vehicle communication available"], safety: ["follow road-test policy if symptom requires driving"], title: "Scan engine module and freeze-frame data", tools: ["scan tool"], reason: "Broad engine concerns need DTC, freeze-frame, and live-data context before cause ranking." },
      { discriminates: ["leak", "overheating", "mechanical damage"], expectedEvidence: ["fluid level/condition", "visible leak/damage notes", "photo if abnormal"], key: "ENGINE_VISUAL_FLUID", prerequisites: ["engine safe to inspect", "hot surfaces controlled"], safety: ["do not open hot pressurized cooling system"], title: "Visual and fluid condition inspection", tools: ["inspection light"], reason: "Leaks, overheating, and obvious damage should be ruled in or out early." }
    ]
  },
  {
    authority: "INTERNAL_SEED",
    domainFamily: "MECHANICAL",
    id: "TRANSMISSION_DRIVETRAIN",
    label: "Transmission & Drivetrain",
    keywords: ["transmission", "trans", "gear", "shift", "slip", "drivetrain", "axle", "converter", "differential"],
    symptomAliases: {
      slipping: ["slip", "slipping", "flare"],
      "harsh shift": ["hard shift", "harsh shift", "bang shift"],
      leak: ["leak", "fluid leak", "trans leak"],
      "no movement": ["no movement", "won't move", "no drive", "no reverse"],
      replacement: ["replacement", "replace", "install transmission"]
    },
    missingQuestions: ["Is this a customer symptom, a confirmed replacement, or a requested estimate?", "Does it slip, shift harshly, leak, make noise, or fail to move?", "Has fluid level/condition and scan data been checked?"],
    commonCauses: [
      { cause: "Low/contaminated fluid or leak path", symptoms: ["slipping", "harsh shift", "leak"], evidenceNeeded: ["fluid level", "fluid condition", "leak location", "pan/line/cooler inspection"] },
      { cause: "Control/module/adaptation issue", symptoms: ["harsh shift", "slipping"], evidenceNeeded: ["TCM codes", "adaptive values", "software/calibration status"] },
      { cause: "Internal transmission failure", symptoms: ["no movement", "slipping", "noise"], evidenceNeeded: ["pressure test", "debris inspection", "road test", "DTC/live data"] }
    ],
    tests: [
      { discriminates: ["fluid leak", "contaminated fluid", "internal failure"], expectedEvidence: ["fluid level", "fluid condition", "leak location", "temperature condition"], key: "TRANS_FLUID_CHECK", prerequisites: ["vehicle safely lifted or level per procedure", "fluid temperature method available"], safety: ["hot fluid and rotating component precautions"], title: "Check transmission fluid level, condition, and leaks", tools: ["lift", "fluid temperature source"], reason: "Fluid condition and leak evidence are required before replacement assumptions." },
      { discriminates: ["control/module issue", "programming/adaptation need", "internal fault clue"], expectedEvidence: ["TCM DTCs", "adaptation values", "software/calibration status"], key: "TRANS_SCAN_ADAPTATION", prerequisites: ["scan communication available", "vehicle battery support if programming review continues"], safety: ["do not program without authorization and battery support"], title: "Scan TCM and review adaptation/programming status", tools: ["scan tool"], reason: "Modern transmission replacement and drivability concerns may require programming or relearn review." }
    ]
  },
  {
    authority: "INTERNAL_SEED",
    domainFamily: "MECHANICAL",
    id: "BRAKE_ABS_STABILITY",
    label: "Brakes, ABS & Stability",
    keywords: ["brake", "brakes", "abs", "stability", "grind", "grinding", "squeal", "rotor", "caliper", "pedal"],
    symptomAliases: {
      noise: ["grind", "grinding", "squeal", "noise"],
      pulsation: ["pulsate", "pulsation", "shake when braking"],
      "warning light": ["abs", "brake light", "traction light"],
      pull: ["pull", "pulling"]
    },
    missingQuestions: ["Is the symptom noise, pulsation, warning light, pull, soft pedal, or poor stopping?", "Which corner or condition reproduces it?", "Is the vehicle safe to road test?"],
    commonCauses: [
      { cause: "Pad/rotor wear or contact", symptoms: ["noise", "pulsation"], evidenceNeeded: ["pad thickness", "rotor condition", "hardware condition"] },
      { cause: "Hydraulic or caliper issue", symptoms: ["pull", "poor stopping", "soft pedal"], evidenceNeeded: ["leak inspection", "caliper operation", "brake fluid condition"] },
      { cause: "Wheel speed/ABS control issue", symptoms: ["warning light"], evidenceNeeded: ["ABS codes", "wheel speed data", "sensor/circuit checks"] }
    ],
    tests: [
      { discriminates: ["pad/rotor wear", "hardware contact", "caliper issue"], expectedEvidence: ["pad thickness", "rotor condition", "hardware/caliper observation"], key: "BRAKE_VISUAL_MEASURE", prerequisites: ["vehicle lifted safely", "wheel removal authorized if required"], safety: ["support vehicle before wheel/brake inspection"], title: "Inspect and measure brake friction, rotor, and hardware", tools: ["lift", "micrometer"], reason: "Brake noise and pulsation require direct physical evidence." }
    ]
  },
  {
    authority: "INTERNAL_SEED",
    domainFamily: "ELECTRICAL",
    id: "STARTING_CHARGING",
    label: "Starting & Charging",
    keywords: ["battery", "starter", "alternator", "charging", "no crank", "slow crank", "dead"],
    symptomAliases: {
      "no crank": ["no crank", "click", "clicking", "won't crank"],
      "slow crank": ["slow crank", "dragging"],
      "dead battery": ["dead battery", "battery dies"],
      "charging light": ["battery light", "charging light"]
    },
    missingQuestions: ["Does it crank, click, crank slowly, or have no electrical power?", "Is the failure current or intermittent?", "Has battery state of charge been verified?"],
    commonCauses: [
      { cause: "Battery state or capacity fault", symptoms: ["no crank", "slow crank", "dead battery"], evidenceNeeded: ["state of charge", "load test", "terminal inspection"] },
      { cause: "High resistance feed/ground path", symptoms: ["no crank", "slow crank"], evidenceNeeded: ["voltage drop", "terminal condition", "ground inspection"] },
      { cause: "Starter control or starter motor fault", symptoms: ["no crank", "clicking"], evidenceNeeded: ["control signal", "starter current", "relay command"] }
    ],
    tests: [
      { discriminates: ["battery capacity", "voltage supply", "starting circuit baseline"], expectedEvidence: ["state of charge", "loaded voltage", "terminal condition"], key: "STARTING_BATTERY_BASELINE", prerequisites: ["battery accessible", "meter/tester available"], safety: ["eye protection near battery"], title: "Battery state-of-charge and loaded voltage baseline", tools: ["battery tester", "DVOM"], reason: "Starting diagnosis needs a known-good electrical baseline." }
    ]
  },
  {
    authority: "INTERNAL_SEED",
    domainFamily: "MECHANICAL",
    id: "COOLING",
    label: "Cooling System",
    keywords: ["coolant", "cooling", "radiator", "thermostat", "water pump", "overheat", "overheating", "fan"],
    symptomAliases: {
      overheating: ["overheat", "overheating", "runs hot"],
      leak: ["coolant leak", "leaking coolant"],
      "no heat": ["no heat", "heater cold"]
    },
    missingQuestions: ["Is coolant level low, is there a leak, or does temperature rise under specific conditions?", "Are fans commanded on and operating?", "Is the system safe/cool before opening?"],
    commonCauses: [
      { cause: "Coolant leak or pressure loss", symptoms: ["leak", "overheating"], evidenceNeeded: ["pressure test", "visual leak evidence", "coolant level"] },
      { cause: "Thermostat/fan/flow issue", symptoms: ["overheating"], evidenceNeeded: ["temperature delta", "fan command", "hose temperature", "flow check"] }
    ],
    tests: [
      { discriminates: ["external leak", "pressure loss", "coolant level issue"], expectedEvidence: ["pressure test result", "leak observation", "coolant level/condition"], key: "COOLING_PRESSURE_VISUAL", prerequisites: ["system cool enough for safe service", "pressure cap access"], safety: ["do not open hot pressurized system"], title: "Cooling system visual and pressure test", tools: ["pressure tester"], reason: "Leaks and pressure loss should be checked before deeper overheating diagnosis." }
    ]
  },
  {
    authority: "INTERNAL_SEED",
    domainFamily: "MECHANICAL",
    id: "HVAC",
    label: "HVAC",
    keywords: ["ac", "a/c", "air conditioning", "heat", "heater", "hvac", "blower", "climate"],
    symptomAliases: {
      "no cooling": ["ac not cold", "no ac", "warm ac"],
      "no heat": ["no heat", "heater cold"],
      "no airflow": ["blower", "no air", "no airflow"]
    },
    missingQuestions: ["Is the problem no cooling, no heat, no airflow, wrong temperature, smell, or noise?", "Does blower speed change?", "Are pressures or temperature deltas recorded?"],
    commonCauses: [
      { cause: "Refrigerant/pressure concern", symptoms: ["no cooling"], evidenceNeeded: ["pressure readings", "temperature delta", "leak check"] },
      { cause: "Blend/airflow control issue", symptoms: ["no heat", "no airflow"], evidenceNeeded: ["actuator command", "blower operation", "mode door behavior"] }
    ],
    tests: [
      { discriminates: ["refrigerant pressure", "temperature delta", "airflow/control issue"], expectedEvidence: ["ambient temperature", "vent temperature", "pressure readings"], key: "HVAC_TEMP_PRESSURE_BASELINE", prerequisites: ["HVAC system allowed to run", "shop refrigerant policy followed"], safety: ["refrigerant handling requires approved equipment"], title: "HVAC temperature and pressure baseline", tools: ["thermometer", "manifold or machine"], reason: "HVAC diagnosis needs temperature and pressure evidence." }
    ]
  },
  {
    authority: "INTERNAL_SEED",
    domainFamily: "ELECTRICAL",
    id: "ELECTRICAL_NETWORK",
    label: "Electrical & Network",
    keywords: ["electrical", "wiring", "module", "network", "can", "communication", "short", "open", "power", "ground"],
    symptomAliases: {
      intermittent: ["intermittent", "sometimes", "random"],
      "communication fault": ["no communication", "network", "can", "module offline"],
      "power ground": ["power", "ground", "fuse", "short", "open"]
    },
    missingQuestions: ["Is the issue intermittent or current?", "Which module/system is affected?", "Have power, ground, and network communication been verified?"],
    commonCauses: [
      { cause: "Power or ground integrity fault", symptoms: ["power ground", "intermittent"], evidenceNeeded: ["voltage drop", "load test", "connector inspection"] },
      { cause: "Network/module communication fault", symptoms: ["communication fault"], evidenceNeeded: ["network scan", "topology", "scope pattern", "module power/ground"] }
    ],
    tests: [
      { discriminates: ["power supply fault", "ground integrity fault", "module/network symptom"], expectedEvidence: ["voltage drop", "loaded power/ground reading", "fuse/circuit note"], key: "ELECTRICAL_POWER_GROUND_BASELINE", prerequisites: ["wiring access identified", "circuit protected from shorts"], safety: ["avoid piercing safety-critical harnesses without approval"], title: "Power, ground, and fuse-load baseline", tools: ["DVOM", "test light"], reason: "Electrical diagnosis must prove power and ground integrity before module replacement." }
    ]
  },
  {
    authority: "INTERNAL_SEED",
    domainFamily: "BODY",
    id: "BODY_COLLISION",
    label: "Body, Door & Collision",
    keywords: ["body", "door", "window", "glass", "latch", "lock", "handle", "dent", "paint", "bumper", "collision", "water leak"],
    symptomAliases: {
      "door repair": ["door", "latch", "handle", "hinge", "lock"],
      "window concern": ["window", "glass", "regulator"],
      "water leak": ["water leak", "leaking water"],
      damage: ["dent", "collision", "bumper", "paint"]
    },
    missingQuestions: ["Is this damage, water leak, door fitment, latch/lock, glass/window, wiring, or refinish?", "Which panel or side is affected?", "Are diagrams/part numbers available from a licensed source?"],
    commonCauses: [
      { cause: "Door hardware/fitment issue", symptoms: ["door repair"], evidenceNeeded: ["alignment observation", "hinge/latch inspection", "weatherstrip condition"] },
      { cause: "Window regulator/glass/run-channel issue", symptoms: ["window concern"], evidenceNeeded: ["motor command", "regulator inspection", "glass track condition"] },
      { cause: "Collision/refinish scope issue", symptoms: ["damage"], evidenceNeeded: ["photo evidence", "damage map", "blend/refinish assessment"] }
    ],
    tests: [
      { discriminates: ["hardware fitment", "trim/electrical overlap", "refinish/calibration scope"], expectedEvidence: ["damage/fitment observation", "affected subcomponent list", "photo if abnormal"], key: "BODY_AREA_TREE_REVIEW", prerequisites: ["affected area identified", "licensed diagram source marked if used"], safety: ["SRS/ADAS caution if trim, glass, or sensor area is involved"], title: "Open repair-area tree and inspect related parts", tools: ["visual inspection", "licensed diagram source when connected"], reason: "Body concerns often span hardware, trim, electrical, refinish, and calibration boundaries." }
    ]
  },
  {
    authority: "INTERNAL_SEED",
    domainFamily: "ADAS",
    id: "ADAS_CALIBRATION",
    label: "ADAS & Calibration",
    keywords: ["adas", "camera", "radar", "calibration", "lane", "blind spot", "sensor", "program", "programming"],
    symptomAliases: {
      calibration: ["calibration", "calibrate", "program", "programming"],
      "sensor damage": ["camera", "radar", "sensor", "blind spot"]
    },
    missingQuestions: ["Was a sensor, windshield, bumper, alignment, module, or structural repair involved?", "Are calibration prerequisites and scan status available?", "Is a licensed OEM procedure source connected?"],
    commonCauses: [
      { cause: "Calibration prerequisite not met", symptoms: ["calibration"], evidenceNeeded: ["scan report", "alignment/precondition check", "OEM procedure reference"] },
      { cause: "Sensor damage or aim issue", symptoms: ["sensor damage"], evidenceNeeded: ["visual damage", "mount inspection", "scan data", "calibration result"] }
    ],
    tests: [
      { discriminates: ["sensor damage", "calibration prerequisite", "module/calibration status"], expectedEvidence: ["scan status", "sensor/mount observation", "prerequisite checklist"], key: "ADAS_PREREQUISITE_REVIEW", prerequisites: ["vehicle identity and equipment confirmed", "calibration area/tool availability known"], safety: ["do not release ADAS concern without prerequisite and calibration outcome review"], title: "ADAS prerequisite and scan review", tools: ["scan tool", "calibration equipment"], reason: "ADAS work must satisfy prerequisites before calibration or release." }
    ]
  }
];

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9/+'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesPhrase(text: string, phrase: string) {
  const normalized = normalizeText(phrase);
  return normalized.length > 0 && ` ${text} `.includes(` ${normalized} `);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function detectSymptoms(text: string, pack: DomainRulePack) {
  return Object.entries(pack.symptomAliases)
    .filter(([, aliases]) => aliases.some((alias) => includesPhrase(text, alias)))
    .map(([symptom]) => symptom);
}

function domainScore(text: string, pack: DomainRulePack) {
  const keywordScore = pack.keywords.reduce((score, keyword) => score + (includesPhrase(text, keyword) ? 4 : 0), 0);
  const symptomScore = Object.values(pack.symptomAliases).flat().reduce((score, alias) => score + (includesPhrase(text, alias) ? 6 : 0), 0);
  return keywordScore + symptomScore;
}

function classifyGate(input: TroubleshootingCaseInput, missingQuestions: string[]) {
  const factCount = input.diagnosticCase.observations.length + input.diagnosticCase.measurements.length;
  if (input.qualitySafetyGates.readyForReasoning) return "SUSPECTED_CAUSE_REVIEW" as const;
  if (!input.diagnosticCase.concern.trim() || missingQuestions.length >= 3) return "INTAKE_NEEDED" as const;
  if (!input.qualitySafetyGates.readyForReasoning && factCount === 0) return "EVIDENCE_NEEDED" as const;
  return "TEST_RECOMMENDED" as const;
}

function sourceStatus(label: string, state: "INTERNAL_SEED" | "NOT_CONNECTED" | "REVIEW_REQUIRED", detail: string) {
  return { detail, label, state };
}

function text(raw: unknown, label: string, maximum = 1000, minimum = 0) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length < minimum) throw new Error(`${label} is required.`);
  if (value.length > maximum) throw new Error(`${label} cannot exceed ${maximum} characters.`);
  return value;
}

function list(raw: unknown, label: string, maximum = 20) {
  if (!Array.isArray(raw)) throw new Error(`${label} must be a list.`);
  if (raw.length > maximum) throw new Error(`${label} cannot contain more than ${maximum} entries.`);
  return raw;
}

function positiveVersion(raw: unknown) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error("Expected diagnostic-case version must be a positive integer.");
  return value;
}

function safeJsonObject(raw: unknown, label: string) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`${label} must be an object.`);
  return raw as Record<string, unknown>;
}

export function diagnosticTroubleshootingSessionId(organizationId: string, caseId: string, idempotencyKey: string) {
  return `dts_${hashEnterpriseCommand({ organizationId, caseId, idempotencyKey: idempotencyKey.trim() }).slice(0, 24)}`;
}

export function normalizeDiagnosticTroubleshootingSessionCommand(value: unknown) {
  const raw = safeJsonObject(value, "Troubleshooting session command");
  const selectedTestKey = text(raw.selectedTestKey, "Selected test key", 120);
  const overrideReason = text(raw.overrideReason, "Override reason", 500);
  if (overrideReason && !allowedOverrideReasons.has(overrideReason)) throw new Error("Override reason is not one of the governed troubleshooting options.");
  return {
    expectedVersion: positiveVersion(raw.expectedVersion),
    idempotencyKey: text(raw.idempotencyKey, "Troubleshooting idempotency key", 200, 1),
    reason: text(raw.reason, "Command reason", 500, 10),
    intakeRefinement: safeJsonObject(raw.intakeRefinement, "Intake refinement"),
    vehicleIntelligenceAcknowledgements: list(raw.vehicleIntelligenceAcknowledgements, "Vehicle intelligence acknowledgements", 12),
    selectedTestKey: selectedTestKey || null,
    overrideReason: overrideReason || null,
    advisorDraftPacket: safeJsonObject(raw.advisorDraftPacket, "Advisor draft packet"),
    learningProposal: safeJsonObject(raw.learningProposal, "Learning proposal"),
    knownIssueSnapshot: list(raw.knownIssueSnapshot, "Known issue snapshot", 20),
    rulePackSnapshot: safeJsonObject(raw.rulePackSnapshot, "Rule-pack snapshot"),
    supersedesId: text(raw.supersedesId, "Superseded troubleshooting session", 200)
  };
}

export function checksumTroubleshootingSession(value: unknown) {
  return hashEnterpriseCommand(value).slice(0, 64);
}

function statusLabel(state: TroubleshootingGateState) {
  const labels: Record<TroubleshootingGateState, string> = {
    EVIDENCE_NEEDED: "Evidence needed",
    INTAKE_NEEDED: "Intake needed",
    SUSPECTED_CAUSE_REVIEW: "Suspected cause review",
    TEST_RECOMMENDED: "Test recommended",
    VEHICLE_INTELLIGENCE_NEEDED: "Vehicle intelligence needed"
  };
  return labels[state];
}

function buildEvidenceCapturePlan(input: TroubleshootingCaseInput, tests: Array<DomainRulePack["tests"][number] & { domainId: TroubleshootingDomainId; domainLabel: string }>, commonCauses: Array<{ evidenceNeeded: string[] }>) {
  const expectedEvidence = unique([...tests.flatMap((test) => test.expectedEvidence), ...commonCauses.flatMap((cause) => cause.evidenceNeeded)]).slice(0, 10);
  const currentObservationCount = input.diagnosticCase.observations.length;
  const currentMeasurementCount = input.diagnosticCase.measurements.length;
  const measurementNeeds = expectedEvidence.filter((item) => /(voltage|pressure|temperature|level|condition|thickness|reading|value|delta|test result|state of charge)/i.test(item));
  const observationNeeds = expectedEvidence.filter((item) => !measurementNeeds.includes(item));
  return {
    captureState: currentObservationCount + currentMeasurementCount === 0 ? "NO_EVIDENCE_RECORDED" as const : input.qualitySafetyGates.readyForReasoning ? "EVIDENCE_READY" as const : "MORE_EVIDENCE_NEEDED" as const,
    current: {
      measurements: currentMeasurementCount,
      observations: currentObservationCount,
      invalid: input.qualitySafetyGates.counts.invalid,
      suspect: input.qualitySafetyGates.counts.suspect
    },
    observationsToCapture: observationNeeds.slice(0, 6),
    measurementsToCapture: measurementNeeds.slice(0, 6),
    attachmentPrompts: ["scan report", "photos/video of abnormal condition", "waveform or live-data capture when applicable"].filter((item) => expectedEvidence.some((evidence) => evidence.includes(item.split(" ")[0])) || item === "photos/video of abnormal condition"),
    entryPoint: `/diagnostics/cases/${encodeURIComponent(input.diagnosticCase.id)}#evidence`
  };
}

function buildAdvisorHandoff(input: TroubleshootingCaseInput, gateState: TroubleshootingGateState, commonCauses: Array<{ cause: string; rankState: string }>) {
  const supported = commonCauses.find((cause) => cause.rankState === "SUPPORTED");
  if (["CONFIRMED", "REPAIR_PLANNING", "HANDED_OFF", "POST_REPAIR_VERIFICATION", "VERIFIED_CLOSED"].includes(input.diagnosticCase.status)) {
    return {
      readiness: "CONFIRMED_CAUSE_REPAIR_RECOMMENDED" as const,
      summary: "Diagnostic case has advanced to confirmed/repair planning status. Advisor may review the governed handoff package.",
      nextAction: "Open advisor review and verify customer-facing wording, estimate boundaries, parts, tax, and authorization.",
      requiredBeforeCustomer: ["advisor review", "estimate authority review", "customer authorization"]
    };
  }
  if (supported) {
    return {
      readiness: "SUSPECTED_CAUSE_REVIEW" as const,
      summary: `${supported.cause} is supported for technician review, but advisor language must remain suspected until qualified confirmation.`,
      nextAction: "Technician should confirm or abstain before repair recommendation.",
      requiredBeforeCustomer: ["qualified technician confirmation", "contradiction review", "advisor-safe summary"]
    };
  }
  if (gateState === "INTAKE_NEEDED") {
    return {
      readiness: "NEEDS_MORE_DIAGNOSIS" as const,
      summary: "The concern needs more detail before advisor repair language is safe.",
      nextAction: "Ask focused symptom and condition questions, then collect first evidence.",
      requiredBeforeCustomer: ["clarified symptom", "initial evidence", "vehicle intelligence acknowledgement"]
    };
  }
  return {
    readiness: "TEST_AUTHORIZATION_REQUIRED" as const,
    summary: "The console has a diagnostic direction, but testing evidence is still needed before cause language is safe.",
    nextAction: "Request or perform the next eligible diagnostic test.",
    requiredBeforeCustomer: ["test result", "evidence review", "technician interpretation"]
  };
}

function buildLearningLoop(input: TroubleshootingCaseInput, selected: Array<{ pack: DomainRulePack; score: number; symptoms: string[] }>) {
  const caseClosed = input.diagnosticCase.status === "VERIFIED_CLOSED";
  const domains = selected.map((match) => match.pack.label);
  return {
    state: caseClosed ? "OUTCOME_REVIEW_READY" as const : "WAITING_FOR_VERIFIED_OUTCOME" as const,
    reviewQueue: ["symptom vocabulary review", "common-cause ranking review", "test sequencing review", "advisor handoff wording review"],
    proposedSignals: [
      domains.length ? `Review whether ${domains.join(", ")} matching was useful for this case.` : "Review whether fallback domain selection was appropriate.",
      input.qualitySafetyGates.readyForReasoning ? "Confirmed evidence gate can be replayed for future ranking calibration." : "Missing evidence should inform future intake prompts.",
      "No production rule should change until manager/master-tech review approves the learning proposal."
    ],
    activationRule: "Learning proposals are draft-only until reviewed, versioned, and approved."
  };
}

function buildIntakeRefinement(selected: Array<{ pack: DomainRulePack; score: number; symptoms: string[] }>, broadOnly: boolean) {
  const primary = selected[0]?.pack;
  const symptomOptions = primary ? Object.keys(primary.symptomAliases) : [];
  return {
    mode: broadOnly ? "INTERACTIVE_REFINEMENT_REQUIRED" as const : "REVIEW_AND_CONFIRM" as const,
    questions: [
      {
        id: "primary_symptom",
        label: "Primary symptom",
        options: symptomOptions.length ? symptomOptions : ["noise", "warning light", "leak", "intermittent", "not working"],
        prompt: primary ? `Select the closest ${primary.label} symptom.` : "Select the closest symptom family.",
        required: true
      },
      {
        id: "when_happens",
        label: "When it happens",
        options: ["cold start", "hot soak", "idle", "acceleration", "cruise", "braking", "turning", "intermittent/random"],
        prompt: "Capture the operating condition that reproduces the concern.",
        required: true
      },
      {
        id: "current_or_intermitent",
        label: "Current or intermittent",
        options: ["currently present", "intermittent", "cannot duplicate yet", "customer-requested repair only"],
        prompt: "Record whether the concern is present now.",
        required: true
      }
    ],
    draftSymptomProfile: {
      domains: selected.map((match) => match.pack.id),
      symptoms: unique(selected.flatMap((match) => match.symptoms)),
      confidence: broadOnly ? "NEEDS_TECHNICIAN_INPUT" as const : "SYSTEM_SUGGESTED" as const
    },
    persistence: "Draft-only in this slice; future persistence should store technician answers with case lineage."
  };
}

function buildRulePackRegistry(selected: Array<{ pack: DomainRulePack; score: number; symptoms: string[] }>) {
  return {
    active: selected.map((match) => ({
      authority: match.pack.authority,
      commonCauseCount: match.pack.commonCauses.length,
      domainFamily: match.pack.domainFamily,
      id: match.pack.id,
      label: match.pack.label,
      score: match.score,
      symptomCount: Object.keys(match.pack.symptomAliases).length,
      testCount: match.pack.tests.length
    })),
    available: domainRulePacks.map((pack) => ({ authority: pack.authority, domainFamily: pack.domainFamily, id: pack.id, label: pack.label })),
    contract: "assembly tree + labor rules + parts rules + fitment rules + calibration/refinish/accessory rules may attach to the same domain registry without changing the console engine."
  };
}

function vehicleAcknowledgements(input: TroubleshootingCaseInput) {
  const base = `/diagnostics/cases/${encodeURIComponent(input.diagnosticCase.id)}/troubleshooting`;
  return [
    { id: "repair_history", label: "Repair history reviewed", required: true, state: "NEEDS_REVIEW" as const, action: "Open RO / Vehicle 360 history", href: `/vehicles/360/${encodeURIComponent(input.diagnosticCase.vehicle.id)}` },
    { id: "known_issue_library", label: "Known issue library reviewed", required: true, state: "NEEDS_REVIEW" as const, action: "Review internal pattern matches", href: base },
    { id: "recall_campaign", label: "Recall / campaign status", required: true, state: "SOURCE_NOT_CONNECTED" as const, action: "Mark unavailable until connector is enabled", href: base },
    { id: "service_bulletin", label: "Service bulletin / warranty extension status", required: true, state: "SOURCE_NOT_CONNECTED" as const, action: "Mark unavailable until licensed source is enabled", href: base },
    { id: "licensed_oem_data", label: "Licensed OEM data boundary", required: true, state: "SOURCE_NOT_CONNECTED" as const, action: "Do not cite proprietary procedures or part numbers", href: base }
  ];
}

function testOverrideReasons(recommended: (DomainRulePack["tests"][number] & { domainId: TroubleshootingDomainId; domainLabel: string }) | null) {
  return {
    recommendedTestKey: recommended?.key ?? null,
    options: [
      "symptom currently present and another eligible test is more discriminating",
      "tool unavailable",
      "safer test first",
      "customer authorization limit",
      "already performed outside console",
      "master technician direction",
      "intermittent condition not reproducible",
      "vehicle condition prevents this test"
    ],
    policy: "Technician may select an eligible alternative, but the console should capture the reason and preserve the original recommendation."
  };
}

function licensedConnectorInterfaces() {
  return [
    {
      id: "PUBLIC_RECALL",
      label: "Public recall / campaign lookup",
      status: "NOT_CONNECTED" as const,
      capability: "Check vehicle recall and campaign status from a lawful public or licensed source.",
      requiredInputs: ["VIN", "vehicle year/make/model", "retrieved-at timestamp", "source URL or provider id"],
      citationRules: ["Display source, retrieved time, and recall/campaign identifier.", "Never treat a recall match as the diagnostic cause without symptom and evidence fit."],
      prohibitedUses: ["Do not imply completion or warranty coverage without source confirmation.", "Do not overwrite technician evidence."]
    },
    {
      id: "OEM_TSB",
      label: "OEM TSB / warranty extension connector",
      status: "LICENSE_REQUIRED" as const,
      capability: "Surface relevant service bulletins, warranty extensions, and known procedure references when a licensed provider is connected.",
      requiredInputs: ["VIN or exact fitment", "mileage when available", "symptom/domain", "licensed provider citation"],
      citationRules: ["Show only title-level metadata unless the license permits full content.", "Preserve provider, document id, effective date, and applicability note."],
      prohibitedUses: ["Do not scrape proprietary repair information.", "Do not present bulletin existence as proof of failure."]
    },
    {
      id: "OEM_SERVICE_INFORMATION",
      label: "OEM service procedure connector",
      status: "LICENSE_REQUIRED" as const,
      capability: "Attach official procedure prerequisites, hazards, torque/programming/calibration references, and release checks.",
      requiredInputs: ["VIN/trim/engine/transmission", "repair area", "licensed source", "procedure revision"],
      citationRules: ["Display procedure identity and revision, not copied proprietary instructions unless licensed.", "Keep technician acknowledgement separate from automated recommendation."],
      prohibitedUses: ["Do not generate executable OEM procedures from memory.", "Do not bypass qualification, tooling, or safety requirements."]
    },
    {
      id: "OEM_PARTS_DIAGRAM",
      label: "OEM parts diagram / fitment connector",
      status: "LICENSE_REQUIRED" as const,
      capability: "Resolve assembly diagrams, OEM part numbers, supersessions, fitment, seals, fluids, clips, fasteners, and one-time-use accessories.",
      requiredInputs: ["VIN", "repair area", "selected assembly node", "provider part citation"],
      citationRules: ["Show part number, description, fitment status, quantity basis, and source.", "Flag supersession and backorder data as provider-owned facts."],
      prohibitedUses: ["Do not invent OEM part numbers.", "Do not auto-order parts without parts-authority approval."]
    },
    {
      id: "OEM_CALIBRATION_PROCEDURE",
      label: "Programming / calibration connector",
      status: "LICENSE_REQUIRED" as const,
      capability: "Identify programming, relearn, ADAS calibration, initialization, battery support, scan, and post-repair verification requirements.",
      requiredInputs: ["VIN/equipment", "replaced component", "module/system", "licensed procedure reference"],
      citationRules: ["Separate prerequisite, execution, and release evidence.", "Keep programming authorization and scan-result evidence auditable."],
      prohibitedUses: ["Do not perform programming automatically.", "Do not release safety-critical systems without documented completion evidence."]
    }
  ];
}

function buildTestExecutionBridge(input: TroubleshootingCaseInput, recommended: (DomainRulePack["tests"][number] & { domainId: TroubleshootingDomainId; domainLabel: string }) | null) {
  const existingNode = recommended
    ? input.diagnosticCase.testPlans
      ?.flatMap((plan) => plan.nodes.map((node) => ({ ...node, planId: plan.id, planStatus: plan.status ?? "UNKNOWN", planVersion: plan.version ?? 1 })))
      .find((node) => node.nodeKey === recommended.key || normalizeText(node.title) === normalizeText(recommended.title))
    : null;
  return {
    state: recommended ? existingNode ? "EXISTING_PLAN_NODE_AVAILABLE" as const : "READY_TO_CREATE_GOVERNED_TEST" as const : "NO_RECOMMENDED_TEST" as const,
    recommendedTestKey: recommended?.key ?? null,
    recommendedTitle: recommended?.title ?? null,
    existingPlanNode: existingNode
      ? {
        nodeId: existingNode.id ?? null,
        nodeKey: existingNode.nodeKey,
        planId: existingNode.planId,
        planStatus: existingNode.planStatus,
        planVersion: existingNode.planVersion,
        title: existingNode.title
      }
      : null,
    route: `/diagnostics/cases/${encodeURIComponent(input.diagnosticCase.id)}#test-labs`,
    mutationAllowed: false,
    policy: "This slice links troubleshooting recommendations to the existing governed test-lab workflow. It does not auto-start tests, bypass authorization, or record execution results."
  };
}

function buildAiContextPacket(input: TroubleshootingCaseInput, knownIssueMatches: Array<{ domainLabel: string; evidenceRequired: string[]; issueId: string; matchState: string; summary: string; source: string }>, tests: Array<DomainRulePack["tests"][number] & { domainId: TroubleshootingDomainId; domainLabel: string }>, commonCauses: Array<{ cause: string; domainLabel: string; evidenceNeeded: string[]; rankState: string }>) {
  const packet = {
    caseId: input.diagnosticCase.id,
    concern: input.diagnosticCase.concern,
    vehicle: input.diagnosticCase.vehicle,
    evidenceSummary: {
      observationCount: input.diagnosticCase.observations.length,
      measurementCount: input.diagnosticCase.measurements.length,
      readyForReasoning: input.qualitySafetyGates.readyForReasoning,
      reasonCodes: input.qualitySafetyGates.reasonCodes
    },
    knownIssueSummaries: knownIssueMatches.map((match) => ({ issueId: match.issueId, summary: match.summary, source: match.source, matchState: match.matchState })),
    causeCandidates: commonCauses.map((cause) => ({ cause: cause.cause, domainLabel: cause.domainLabel, rankState: cause.rankState, evidenceNeeded: cause.evidenceNeeded })),
    nextTests: tests.map((test) => ({ key: test.key, title: test.title, domainLabel: test.domainLabel, expectedEvidence: test.expectedEvidence })),
    sourceBoundaries: ["Internal seed libraries are not OEM service information.", "Recall, TSB, OEM procedure, parts diagram, and calibration content require licensed connectors.", "Technician evidence and service authority remain the source of truth."],
    forbiddenUses: ["confirm root cause", "authorize repair", "quote parts/labor/tax", "replace technician judgement", "invent OEM procedures or part numbers"]
  };
  return {
    enabled: false,
    gated: true,
    label: "AI-ready context packet prepared; Master Technician AI remains withheld",
    reason: "The console can package governed context now, but model execution stays disabled until evidence, licensing, safety, evaluation, privacy, and authority controls are approved.",
    packet,
    contextChecksum: checksumTroubleshootingSession(packet)
  };
}

function readinessScore(flags: boolean[]) {
  if (!flags.length) return 0;
  return Math.round(flags.filter(Boolean).length / flags.length * 100);
}

function buildPilotTelemetry(input: TroubleshootingCaseInput, gateState: TroubleshootingGateState, knownIssueMatches: Array<{ matchState: string }>, advisorHandoff: { readiness: string }, tests: Array<{ key: string }>) {
  const evidenceCount = input.diagnosticCase.observations.length + input.diagnosticCase.measurements.length;
  const metrics = {
    intakeCompleteness: readinessScore([Boolean(input.diagnosticCase.concern.trim()), gateState !== "INTAKE_NEEDED"]),
    vehicleIntelligenceAcknowledgement: readinessScore([Boolean(input.diagnosticCase.vehicle.vin), knownIssueMatches.length > 0, false, false]),
    evidenceCompleteness: readinessScore([evidenceCount > 0, input.qualitySafetyGates.counts.independentGroups > 0, input.qualitySafetyGates.readyForReasoning]),
    nextTestReadiness: readinessScore([tests.length > 0, gateState !== "INTAKE_NEEDED"]),
    advisorHandoffReadiness: readinessScore([advisorHandoff.readiness !== "NEEDS_MORE_DIAGNOSIS", input.qualitySafetyGates.readyForReasoning]),
    learningReadiness: readinessScore([input.diagnosticCase.status === "VERIFIED_CLOSED"])
  };
  const blockers = [
    gateState === "INTAKE_NEEDED" ? "Focused intake questions still required." : null,
    input.qualitySafetyGates.readyForReasoning ? null : "Evidence gate is not ready for stronger diagnostic reasoning.",
    "Recall/TSB/OEM connectors are not connected yet.",
    input.diagnosticCase.status === "VERIFIED_CLOSED" ? null : "Learning loop waits for verified outcome."
  ].filter((item): item is string => Boolean(item));
  return {
    mode: "PILOT_TRIAL" as const,
    metrics,
    overallReadiness: Math.round(Object.values(metrics).reduce((sum, value) => sum + value, 0) / Object.values(metrics).length),
    blockers,
    eventContract: ["intake_refined", "vehicle_intelligence_acknowledged", "test_recommended", "test_bridge_opened", "session_snapshot_saved", "advisor_packet_reviewed", "learning_candidate_created"],
    privacyBoundary: "Telemetry is operational readiness only; it should not record unnecessary customer narrative, proprietary source content, or uncontrolled AI prompts."
  };
}

function buildFeatureGates() {
  return {
    console: "technician-troubleshooting-console",
    policy: "Enable capability by capability. Diagnostic suggestions may be piloted before licensed content, AI execution, or automatic mutations are enabled.",
    gates: [
      { id: "troubleshootingSessionPersistence", label: "Session snapshots", state: "ENABLED_PILOT" as const, reason: "Snapshots are governed by case version and command checksum." },
      { id: "licensedConnectors", label: "Licensed recall/TSB/OEM connectors", state: "WITHHELD_LICENSE_REQUIRED" as const, reason: "Interfaces are defined, but no live provider is connected in this branch." },
      { id: "testExecutionBridge", label: "Test execution bridge", state: "READ_ONLY_LINK" as const, reason: "Technicians can open the governed test-lab area; test creation/execution remains under existing authority." },
      { id: "aiAssistant", label: "Master Technician AI", state: "WITHHELD_SAFETY_GATE" as const, reason: "AI remains disabled until source, evidence, safety, privacy, and evaluation controls are approved." },
      { id: "managerReview", label: "Manager review / learning promotion", state: "ENABLED_PILOT" as const, reason: "Learning proposals stay draft-only until reviewed and approved." }
    ]
  };
}

export function buildTechnicianTroubleshootingConsole(input: TroubleshootingCaseInput) {
  const text = normalizeText(input.diagnosticCase.concern);
  const matchedDomains = domainRulePacks
    .map((pack) => ({ pack, score: domainScore(text, pack), symptoms: detectSymptoms(text, pack) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score);
  const fallback = matchedDomains.length ? [] : domainRulePacks.filter((pack) => ["ENGINE_DRIVABILITY", "ELECTRICAL_NETWORK", "BODY_COLLISION"].includes(pack.id)).map((pack) => ({ pack, score: 1, symptoms: [] }));
  const selected = (matchedDomains.length ? matchedDomains : fallback).slice(0, 3);
  const tokens = text.split(" ").filter(Boolean);
  const broadOnly = selected.length > 0 && tokens.some((token) => broadConcernWords.has(token)) && selected.every((match) => match.symptoms.length === 0);
  const missingQuestions = unique(selected.flatMap((match) => match.pack.missingQuestions)).slice(0, broadOnly ? 6 : 4);
  const gateState = classifyGate(input, missingQuestions);
  const evidenceCount = input.diagnosticCase.observations.length + input.diagnosticCase.measurements.length;
  const commonCauses = selected.flatMap((match) => {
    const symptoms = match.symptoms.length ? match.symptoms : Object.keys(match.pack.symptomAliases).slice(0, 2);
    return match.pack.commonCauses
      .filter((cause) => !match.symptoms.length || cause.symptoms.some((symptom) => match.symptoms.includes(symptom)))
      .map((cause) => ({
        cause: cause.cause,
        domainId: match.pack.id,
        domainLabel: match.pack.label,
        evidenceNeeded: cause.evidenceNeeded,
        rankState: evidenceCount === 0 ? "INSUFFICIENT_EVIDENCE" as const : input.qualitySafetyGates.readyForReasoning ? "SUPPORTED" as const : "NEEDS_DISCRIMINATION" as const,
        reasons: [
          `${match.pack.label} matched from concern language`,
          symptoms.length ? `Symptom path: ${symptoms.join(", ")}` : "Broad system concern needs clarification",
          evidenceCount ? `${evidenceCount} evidence item(s) available for review` : "No independent evidence has been recorded yet"
        ]
      }));
  }).slice(0, 6);
  const tests = selected.flatMap((match) => match.pack.tests.map((test) => ({ ...test, domainId: match.pack.id, domainLabel: match.pack.label }))).slice(0, 4);
  const recommendedTest = tests[0] ?? null;
  const advisorHandoff = buildAdvisorHandoff(input, gateState, commonCauses);
  const knownIssueMatches = selected.flatMap((match) => {
    const matches = internalKnownIssueLibrary.filter((issue) => {
      const year = input.diagnosticCase.vehicle.year ?? 0;
      const make = input.diagnosticCase.vehicle.make ?? "";
      const yearApplies = year === 0 || year >= issue.applicability.yearMin && (issue.applicability.yearMax == null || year <= issue.applicability.yearMax);
      const makeApplies = issue.applicability.makes.length === 0 || issue.applicability.makes.includes(make);
      const symptomApplies = !match.symptoms.length || issue.symptoms.some((symptom) => match.symptoms.includes(symptom));
      return issue.domainId === match.pack.id && yearApplies && makeApplies && symptomApplies;
    });
    return (matches.length ? matches : [{
      id: `known-${match.pack.id.toLocaleLowerCase()}-review`,
      domainId: match.pack.id,
      title: `${match.pack.label} known-issue library should be checked`,
      symptoms: match.symptoms,
      applicability: { makes: [], yearMin: 1980, yearMax: null },
      evidenceRequired: match.pack.commonCauses.flatMap((cause) => cause.evidenceNeeded).slice(0, 4),
      source: "Internal seed library; licensed OEM/third-party data not connected."
    }]).map((issue) => ({
      domainId: match.pack.id,
      domainLabel: match.pack.label,
      evidenceRequired: issue.evidenceRequired,
      issueId: issue.id,
      matchState: match.score >= 10 ? "REVIEW_RECOMMENDED" as const : "POSSIBLE" as const,
      summary: issue.title,
      source: issue.source
    }));
  }).slice(0, 6);
  const aiContextPacket = buildAiContextPacket(input, knownIssueMatches, tests, commonCauses);
  const testExecutionBridge = buildTestExecutionBridge(input, recommendedTest);
  const pilotTelemetry = buildPilotTelemetry(input, gateState, knownIssueMatches, advisorHandoff, tests);
  const featureGates = buildFeatureGates();

  return {
    version: TECHNICIAN_TROUBLESHOOTING_CONSOLE_VERSION,
    generatedAt: input.generatedAt,
    caseContext: {
      ageHours: input.diagnosticCase.ageHours,
      assignedUser: input.diagnosticCase.assignedUser,
      concern: input.diagnosticCase.concern,
      id: input.diagnosticCase.id,
      location: input.diagnosticCase.location,
      repairOrder: input.diagnosticCase.repairOrder,
      riskTier: input.diagnosticCase.riskTier,
      stage: input.diagnosticCase.stage,
      status: input.diagnosticCase.status,
      vehicle: input.diagnosticCase.vehicle,
      version: input.diagnosticCase.version
    },
    intake: {
      concernType: broadOnly ? "BROAD_CONCERN" as const : selected.length ? "CLASSIFIED_CONCERN" as const : "UNCLASSIFIED" as const,
      detectedDomains: selected.map((match) => ({ id: match.pack.id, label: match.pack.label, score: match.score })),
      detectedSymptoms: unique(selected.flatMap((match) => match.symptoms)),
      missingQuestions,
      normalizedText: text,
      summary: broadOnly
        ? "Concern language is broad. The console should ask focused diagnostic questions instead of returning no issue found."
        : selected.length
          ? "Concern language mapped to governed diagnostic domains without assuming a root cause."
          : "Concern needs more detail before the console can select a governed diagnostic path."
    },
    intakeRefinement: buildIntakeRefinement(selected, broadOnly),
    rulePackRegistry: buildRulePackRegistry(selected),
    vehicleIntelligence: {
      required: true,
      sources: [
        sourceStatus("Repair history", "REVIEW_REQUIRED", "Review prior repairs and repeat concerns from the RO and Vehicle 360 context."),
        sourceStatus("Known vehicle issue library", "INTERNAL_SEED", "Internal pattern library can provide clues after applicability review."),
        sourceStatus("Safety recall / campaign", "NOT_CONNECTED", "Public or licensed recall connector is not active in this slice."),
        sourceStatus("Service bulletin / warranty extension", "NOT_CONNECTED", "Licensed OEM or service-information connector is required before showing real bulletins."),
        sourceStatus("Licensed diagrams / OEM procedures", "NOT_CONNECTED", "Do not display proprietary procedures, diagrams, part numbers, or labor data without a licensed source.")
      ],
      acknowledgements: vehicleAcknowledgements(input),
      knownIssueMatches
    },
    licensedConnectorInterfaces: licensedConnectorInterfaces(),
    evidenceGate: {
      counts: input.qualitySafetyGates.counts,
      label: statusLabel(gateState),
      readyForReasoning: input.qualitySafetyGates.readyForReasoning,
      reasonCodes: input.qualitySafetyGates.reasonCodes,
      state: gateState
    },
    commonCauses,
    nextTestPlan: {
      alternatives: tests.slice(1),
      recommendation: recommendedTest
        ? {
          ...recommendedTest,
          blocked: gateState === "INTAKE_NEEDED",
          blockedReason: gateState === "INTAKE_NEEDED" ? "Complete focused intake questions before selecting a diagnostic test." : null,
          estimatedMinutes: recommendedTest.key.includes("SCAN") ? 15 : recommendedTest.key.includes("VISUAL") || recommendedTest.key.includes("REVIEW") ? 20 : 30
        }
        : null,
      selectionPolicy: "Recommend the safest highest-value discriminator from the selected domain rule packs. Technician may choose an eligible alternative with reason capture."
    },
    testExecutionBridge,
    testOverride: testOverrideReasons(recommendedTest),
    nextTestPreview: tests,
    evidenceCapturePlan: buildEvidenceCapturePlan(input, tests, commonCauses),
    advisorHandoff: {
      ...advisorHandoff,
      draftPacket: {
        concernSummary: input.diagnosticCase.concern,
        customerSafeStatus: advisorHandoff.summary,
        internalDiagnosticStatus: statusLabel(gateState),
        notReadyReasons: advisorHandoff.requiredBeforeCustomer,
        recommendedAdvisorAction: advisorHandoff.nextAction,
        vehicleSummary: `${input.diagnosticCase.vehicle.label}${input.diagnosticCase.vehicle.vin ? ` · ${input.diagnosticCase.vehicle.vin}` : ""}`,
        warning: "Do not present suspected causes as confirmed repairs. Estimate, taxes, parts, authorization, and dispatch remain owned by their existing authorities."
      }
    },
    learningLoop: buildLearningLoop(input, selected),
    aiContextPacket,
    pilotTelemetry,
    featureGates,
    masterTechnicianGate: {
      enabled: false,
      label: "AI assistant withheld",
      reason: "Master Technician assistance remains gated until evidence, source licensing, safety, evaluation, and authority controls are approved."
    }
  };
}
