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
  commonCauses: Array<{ cause: string; evidenceNeeded: string[]; symptoms: string[] }>;
  id: TroubleshootingDomainId;
  keywords: string[];
  label: string;
  missingQuestions: string[];
  symptomAliases: Record<string, string[]>;
  tests: Array<{ key: string; reason: string; title: string; tools: string[] }>;
};

const broadConcernWords = new Set(["issue", "issues", "problem", "problems", "bad", "wrong", "concern", "noise", "noisy", "not working", "acting up"]);

const domainRulePacks: DomainRulePack[] = [
  {
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
      { key: "ENGINE_SCAN_HEALTH", title: "Scan engine module and freeze-frame data", tools: ["scan tool"], reason: "Broad engine concerns need DTC, freeze-frame, and live-data context before cause ranking." },
      { key: "ENGINE_VISUAL_FLUID", title: "Visual and fluid condition inspection", tools: ["inspection light"], reason: "Leaks, overheating, and obvious damage should be ruled in or out early." }
    ]
  },
  {
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
      { key: "TRANS_FLUID_CHECK", title: "Check transmission fluid level, condition, and leaks", tools: ["lift", "fluid temperature source"], reason: "Fluid condition and leak evidence are required before replacement assumptions." },
      { key: "TRANS_SCAN_ADAPTATION", title: "Scan TCM and review adaptation/programming status", tools: ["scan tool"], reason: "Modern transmission replacement and drivability concerns may require programming or relearn review." }
    ]
  },
  {
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
      { key: "BRAKE_VISUAL_MEASURE", title: "Inspect and measure brake friction, rotor, and hardware", tools: ["lift", "micrometer"], reason: "Brake noise and pulsation require direct physical evidence." }
    ]
  },
  {
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
      { key: "STARTING_BATTERY_BASELINE", title: "Battery state-of-charge and loaded voltage baseline", tools: ["battery tester", "DVOM"], reason: "Starting diagnosis needs a known-good electrical baseline." }
    ]
  },
  {
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
      { key: "COOLING_PRESSURE_VISUAL", title: "Cooling system visual and pressure test", tools: ["pressure tester"], reason: "Leaks and pressure loss should be checked before deeper overheating diagnosis." }
    ]
  },
  {
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
      { key: "HVAC_TEMP_PRESSURE_BASELINE", title: "HVAC temperature and pressure baseline", tools: ["thermometer", "manifold or machine"], reason: "HVAC diagnosis needs temperature and pressure evidence." }
    ]
  },
  {
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
      { key: "ELECTRICAL_POWER_GROUND_BASELINE", title: "Power, ground, and fuse-load baseline", tools: ["DVOM", "test light"], reason: "Electrical diagnosis must prove power and ground integrity before module replacement." }
    ]
  },
  {
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
      { key: "BODY_AREA_TREE_REVIEW", title: "Open repair-area tree and inspect related parts", tools: ["visual inspection", "licensed diagram source when connected"], reason: "Body concerns often span hardware, trim, electrical, refinish, and calibration boundaries." }
    ]
  },
  {
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
      { key: "ADAS_PREREQUISITE_REVIEW", title: "ADAS prerequisite and scan review", tools: ["scan tool", "calibration equipment"], reason: "ADAS work must satisfy prerequisites before calibration or release." }
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
  const knownIssueMatches = selected.map((match) => ({
    domainId: match.pack.id,
    domainLabel: match.pack.label,
    matchState: match.score >= 10 ? "REVIEW_RECOMMENDED" as const : "POSSIBLE" as const,
    summary: `${match.pack.label} known-issue library should be checked for ${input.diagnosticCase.vehicle.label}.`,
    source: "Internal seed library; licensed OEM/third-party data not connected."
  }));

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
    vehicleIntelligence: {
      required: true,
      sources: [
        sourceStatus("Repair history", "REVIEW_REQUIRED", "Review prior repairs and repeat concerns from the RO and Vehicle 360 context."),
        sourceStatus("Known vehicle issue library", "INTERNAL_SEED", "Internal pattern library can provide clues after applicability review."),
        sourceStatus("Safety recall / campaign", "NOT_CONNECTED", "Public or licensed recall connector is not active in this slice."),
        sourceStatus("Service bulletin / warranty extension", "NOT_CONNECTED", "Licensed OEM or service-information connector is required before showing real bulletins."),
        sourceStatus("Licensed diagrams / OEM procedures", "NOT_CONNECTED", "Do not display proprietary procedures, diagrams, part numbers, or labor data without a licensed source.")
      ],
      knownIssueMatches
    },
    evidenceGate: {
      counts: input.qualitySafetyGates.counts,
      label: statusLabel(gateState),
      readyForReasoning: input.qualitySafetyGates.readyForReasoning,
      reasonCodes: input.qualitySafetyGates.reasonCodes,
      state: gateState
    },
    commonCauses,
    nextTestPreview: tests,
    masterTechnicianGate: {
      enabled: false,
      label: "AI assistant withheld",
      reason: "Master Technician assistance remains gated until evidence, source licensing, safety, evaluation, and authority controls are approved."
    }
  };
}
