import type { LaborRepairOperation } from "./labor-operation-taxonomy";

export const REPAIR_AREA_INTELLIGENCE_VERSION = "LABOR-GUIDE-RAI/1.0.0";

export type RepairAreaDomain = "MECHANICAL" | "BODYWORK";
export type RepairAreaRuleType = "LABOR" | "PART" | "FITMENT" | "CALIBRATION" | "REFINISH" | "ACCESSORY";
export type RepairAreaRequirement = "REQUIRED" | "REVIEW" | "OPTIONAL";

export type RepairAreaAssemblyNode = {
  id: string;
  label: string;
  description: string;
  zone: "outer" | "inner" | "electrical" | "sealing" | "hardware" | "finish" | "drivetrain" | "hydraulic" | "brake" | "safety";
};

export type RepairAreaLaborRule = {
  operationId?: string;
  title: string;
  hours: number | null;
  requirement: RepairAreaRequirement;
  reason: string;
};

export type RepairAreaPartRule = {
  assemblyNodeId: string;
  description: string;
  fitmentBasis: string;
  oemPartNumber: string;
  quantity: number;
  requirement: RepairAreaRequirement;
  reviewNote: string;
};

export type RepairAreaIntelligenceRulePack = {
  aliases: string[];
  assembly: RepairAreaAssemblyNode[];
  calibrationRules: string[];
  domain: RepairAreaDomain;
  fitmentRules: string[];
  id: string;
  laborRules: RepairAreaLaborRule[];
  partRules: RepairAreaPartRule[];
  refinishRules: string[];
  title: string;
};

export type RepairAreaIntelligenceResult = {
  activeRulePack: RepairAreaIntelligenceRulePack | null;
  candidateRulePacks: RepairAreaIntelligenceRulePack[];
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  query: string;
  summary: string;
  version: string;
};

const doorAssembly: RepairAreaAssemblyNode[] = [
  { id: "door-shell", label: "Door shell", description: "Outer and inner door structure, corrosion/damage decision point.", zone: "outer" },
  { id: "door-hinges", label: "Hinges and check link", description: "Hinges, check strap, alignment fasteners, and striker relationship.", zone: "hardware" },
  { id: "door-latch", label: "Latch, striker, handle", description: "Latch, lock rods, exterior handle, interior handle, and striker.", zone: "inner" },
  { id: "door-glass", label: "Glass and regulator", description: "Door glass, regulator, motor, run channel, and initialization needs.", zone: "inner" },
  { id: "door-trim", label: "Trim and vapor barrier", description: "Interior trim panel, clips, speaker, water shield, and adhesive.", zone: "inner" },
  { id: "door-wiring", label: "Harness and mirror", description: "Door harness, mirror, speaker, lock/window circuits, blind-spot equipment.", zone: "electrical" },
  { id: "door-seals", label: "Seals and weatherstrip", description: "Belt molding, run channel, door seal, seam sealer, and leak prevention.", zone: "sealing" },
  { id: "door-refinish", label: "Refinish and blend", description: "Refinish door shell and review adjacent-panel blend needs.", zone: "finish" }
];

const transmissionAssembly: RepairAreaAssemblyNode[] = [
  { id: "transmission-case", label: "Transmission assembly", description: "Major unit fitment, supplier source, core, and warranty review.", zone: "drivetrain" },
  { id: "torque-converter", label: "Converter and pump seal", description: "Torque converter, front pump seal, flexplate interface, and seating checks.", zone: "drivetrain" },
  { id: "cooler-lines", label: "Cooler and lines", description: "Cooler flush/replacement, line seals, contamination, and flow checks.", zone: "hydraulic" },
  { id: "fluid-filter", label: "Fluid, filter, pan gasket", description: "VIN-specific fluid, filter, pan gasket, level set, and leak verification.", zone: "hydraulic" },
  { id: "axle-seals", label: "Axle/output seals", description: "Output seals, axle retention hardware, and leak prevention.", zone: "hardware" },
  { id: "programming", label: "Programming and relearn", description: "TCM programming, adaptive relearn, post-scan, and road test conditions.", zone: "electrical" }
];

const brakeAssembly: RepairAreaAssemblyNode[] = [
  { id: "friction", label: "Pads and rotors", description: "Friction material, rotor condition, side/axle scope, and hardware.", zone: "brake" },
  { id: "hydraulic", label: "Hydraulic circuit", description: "Caliper, hose, master/ABS hydraulic impact, and fluid bleed.", zone: "hydraulic" },
  { id: "electronic", label: "ABS/EPB", description: "Wheel speed sensor, EPB service mode, ABS bleed/initialize.", zone: "electrical" }
];

const bumperAssembly: RepairAreaAssemblyNode[] = [
  { id: "bumper-cover", label: "Cover and retainers", description: "Cover, brackets, absorber, grille/trim, retainers, and clips.", zone: "outer" },
  { id: "bumper-sensors", label: "Sensors and lamps", description: "Parking sensors, radar, fog lamps, harnesses, and aiming/calibration.", zone: "electrical" },
  { id: "bumper-finish", label: "Refinish", description: "Refinish cover, texture, color match, and blend decision.", zone: "finish" }
];

export const REPAIR_AREA_RULE_PACKS: RepairAreaIntelligenceRulePack[] = [
  {
    aliases: ["door", "door shell", "door replacement", "door repair", "front door", "rear door", "door glass", "door regulator"],
    assembly: doorAssembly,
    calibrationRules: ["Initialize window/regulator after glass or regulator work.", "Review mirror camera/blind-spot equipment for calibration or scan requirements."],
    domain: "BODYWORK",
    fitmentRules: ["VIN, side, front/rear, trim, speaker, mirror, blind-spot, keyless-entry, and glass tint must be confirmed before ordering."],
    id: "door",
    laborRules: [
      { operationId: "door-shell", title: "Replace door shell", hours: 4, requirement: "REVIEW", reason: "Use when shell damage/corrosion requires replacement." },
      { title: "Transfer door components", hours: 2.2, requirement: "REQUIRED", reason: "Door shell estimates must account for trim, latch, wiring, glass, regulator, handle, and mirror transfer or replacement." },
      { title: "Align door and striker", hours: 0.7, requirement: "REQUIRED", reason: "Door replacement must close, seal, and gap correctly." },
      { operationId: "panel-refinish", title: "Refinish door shell", hours: 2.5, requirement: "REVIEW", reason: "Body-color replacement panels usually require refinish." },
      { title: "Blend adjacent panel review", hours: null, requirement: "REVIEW", reason: "Color match may require blend into adjacent panel." }
    ],
    partRules: [
      { assemblyNodeId: "door-shell", description: "Door shell - side/position specific", fitmentBasis: "VIN + side + front/rear + body style", oemPartNumber: "OEM-DOOR-SHELL-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Do not order until side, position, trim, and paint/refinish plan are confirmed." },
      { assemblyNodeId: "door-hinges", description: "Upper/lower door hinges", fitmentBasis: "VIN + side + position", oemPartNumber: "OEM-DOOR-HINGE-VIN-REVIEW", quantity: 2, requirement: "REVIEW", reviewNote: "Add if bent, worn, corroded, or one-time-use fasteners are specified." },
      { assemblyNodeId: "door-latch", description: "Door latch and striker hardware", fitmentBasis: "VIN + side + lock option", oemPartNumber: "OEM-DOOR-LATCH-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Confirm lock/handle/keyless-entry options." },
      { assemblyNodeId: "door-glass", description: "Door glass and regulator/motor", fitmentBasis: "VIN + tint + regulator type", oemPartNumber: "OEM-DOOR-GLASS-REG-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Select only damaged or non-transferable items." },
      { assemblyNodeId: "door-trim", description: "Trim clips, vapor barrier, and water shield adhesive", fitmentBasis: "VIN + trim panel", oemPartNumber: "OEM-DOOR-CLIP-SEAL-KIT", quantity: 1, requirement: "REQUIRED", reviewNote: "Consumables should be accounted for whenever trim is removed." },
      { assemblyNodeId: "door-seals", description: "Weatherstrip, belt molding, and run channel", fitmentBasis: "VIN + side + position", oemPartNumber: "OEM-DOOR-SEAL-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Add if damaged, brittle, leak-prone, or non-transferable." }
    ],
    refinishRules: ["Door shell replacement needs refinish review.", "Blend adjacent panel when color match risk is high.", "Add seam sealer/cavity wax when repair procedure requires it."],
    title: "Door Assembly"
  },
  {
    aliases: ["transmission", "transmission replacement", "transmission assembly", "gearbox", "transmission r&i"],
    assembly: transmissionAssembly,
    calibrationRules: ["Program/configure TCM when required.", "Perform adaptive relearn and post-scan.", "Road test under required shift-adapt conditions."],
    domain: "MECHANICAL",
    fitmentRules: ["VIN, engine, drive type, calibration family, final drive, cooler design, and reman/new/used source must be confirmed."],
    id: "transmission",
    laborRules: [
      { operationId: "transmission-remove-install", title: "Remove and install transmission assembly", hours: 8.5, requirement: "REQUIRED", reason: "Major unit replacement requires R&I labor." },
      { operationId: "transmission-fluid-service", title: "Transmission fluid fill and level set", hours: 1.4, requirement: "REQUIRED", reason: "Fluid quantity and level procedure must be included." },
      { operationId: "transmission-programming-relearn", title: "Programming/configuration/adaptive relearn", hours: 1.2, requirement: "REQUIRED", reason: "Replacement units often require programming or relearn before release." }
    ],
    partRules: [
      { assemblyNodeId: "transmission-case", description: "Transmission assembly", fitmentBasis: "VIN + engine + drive type + calibration family", oemPartNumber: "OEM-TRANS-ASSEMBLY-VIN-REVIEW", quantity: 1, requirement: "REQUIRED", reviewNote: "Confirm source, core, warranty, cooler contamination, and programming needs." },
      { assemblyNodeId: "fluid-filter", description: "VIN-specific transmission fluid", fitmentBasis: "VIN fluid specification", oemPartNumber: "OEM-ATF-SPEC-VIN-REVIEW", quantity: 12, requirement: "REQUIRED", reviewNote: "Quantity is an estimate until OEM procedure is confirmed." },
      { assemblyNodeId: "fluid-filter", description: "Transmission filter and pan gasket kit", fitmentBasis: "VIN + transmission family", oemPartNumber: "OEM-TRANS-FILTER-KIT-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Required when serviceable filter/pan is disturbed or supplier requires it." },
      { assemblyNodeId: "axle-seals", description: "Axle/output shaft seal set", fitmentBasis: "VIN + axle/drivetrain", oemPartNumber: "OEM-TRANS-SEAL-SET-VIN-REVIEW", quantity: 1, requirement: "REQUIRED", reviewNote: "Recommended to prevent leaks after axle/output removal." },
      { assemblyNodeId: "torque-converter", description: "Torque converter/front pump seal", fitmentBasis: "VIN + converter design", oemPartNumber: "OEM-PUMP-SEAL-VIN-REVIEW", quantity: 1, requirement: "REQUIRED", reviewNote: "Add when converter/front seal is disturbed." },
      { assemblyNodeId: "cooler-lines", description: "Cooler line seals / cooler flush allowance", fitmentBasis: "VIN + cooler design", oemPartNumber: "OEM-TRANS-COOLER-SEAL-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Review contamination and OEM cooler replacement/flush rules." }
    ],
    refinishRules: [],
    title: "Transmission Assembly"
  },
  {
    aliases: ["brake", "brakes", "front brakes", "rear brakes", "pads", "rotors", "caliper"],
    assembly: brakeAssembly,
    calibrationRules: ["Enter EPB service mode when equipped.", "Initialize/bleed ABS hydraulic unit when opened."],
    domain: "MECHANICAL",
    fitmentRules: ["VIN, axle, rotor diameter, caliper type, EPB equipment, and friction grade must be confirmed."],
    id: "brakes",
    laborRules: [
      { operationId: "front-brake-pads-rotors", title: "Replace pads and rotors", hours: 2.1, requirement: "REVIEW", reason: "Use when friction and rotor replacement is approved." },
      { operationId: "brake-fluid-service", title: "Bleed/exchange brake fluid", hours: 1, requirement: "REVIEW", reason: "Required when hydraulic system is opened." }
    ],
    partRules: [
      { assemblyNodeId: "friction", description: "Pad set", fitmentBasis: "VIN + axle + brake package", oemPartNumber: "OEM-BRAKE-PADS-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Confirm axle and brake package." },
      { assemblyNodeId: "friction", description: "Rotor", fitmentBasis: "VIN + axle + rotor diameter", oemPartNumber: "OEM-BRAKE-ROTOR-VIN-REVIEW", quantity: 2, requirement: "REVIEW", reviewNote: "Confirm side/axle and diameter." },
      { assemblyNodeId: "friction", description: "Brake hardware kit", fitmentBasis: "VIN + axle", oemPartNumber: "OEM-BRAKE-HARDWARE-KIT", quantity: 1, requirement: "REVIEW", reviewNote: "Add when hardware is corroded, damaged, or included by policy." }
    ],
    refinishRules: [],
    title: "Brake Assembly"
  },
  {
    aliases: ["bumper", "front bumper", "bumper cover", "collision bumper"],
    assembly: bumperAssembly,
    calibrationRules: ["Review radar/parking sensor calibration after bumper cover or sensor work."],
    domain: "BODYWORK",
    fitmentRules: ["VIN, trim, sensor package, fog lamps, grille texture, tow hook, and radar equipment must be confirmed."],
    id: "bumper",
    laborRules: [
      { operationId: "bumper-cover-front", title: "Replace front bumper cover", hours: 2.6, requirement: "REVIEW", reason: "Use when cover replacement is approved." },
      { operationId: "panel-refinish", title: "Refinish bumper cover", hours: 2.5, requirement: "REVIEW", reason: "Painted covers need refinish and color match review." },
      { operationId: "radar-calibration", title: "Radar / blind-spot calibration", hours: 1.7, requirement: "REVIEW", reason: "Required when equipped sensors are moved or replaced." }
    ],
    partRules: [
      { assemblyNodeId: "bumper-cover", description: "Front bumper cover", fitmentBasis: "VIN + trim + sensor package", oemPartNumber: "OEM-BUMPER-COVER-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Confirm trim, paintable/texture, and sensor openings." },
      { assemblyNodeId: "bumper-cover", description: "Bumper clips, brackets, and retainers", fitmentBasis: "VIN + cover design", oemPartNumber: "OEM-BUMPER-RETAINER-KIT", quantity: 1, requirement: "REVIEW", reviewNote: "Add commonly broken one-time-use clips and brackets." },
      { assemblyNodeId: "bumper-sensors", description: "Parking/radar sensor brackets or harness", fitmentBasis: "VIN + ADAS/sensor package", oemPartNumber: "OEM-BUMPER-SENSOR-BRACKET-VIN-REVIEW", quantity: 1, requirement: "REVIEW", reviewNote: "Confirm equipped sensors before ordering." }
    ],
    refinishRules: ["Paintable bumper covers need refinish.", "Texture and color-match rules must be confirmed."],
    title: "Bumper Assembly"
  }
];

const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function scoreRulePack(rulePack: RepairAreaIntelligenceRulePack, query: string, operations: LaborRepairOperation[]) {
  const queryText = normalized(query);
  const operationText = normalized(operations.map((operation) => [operation.title, operation.system, operation.subsystem, operation.component, operation.aliases.join(" ")].join(" ")).join(" "));
  const haystack = `${queryText} ${operationText}`.trim();
  if (!haystack) return 0;
  let score = 0;
  for (const alias of rulePack.aliases) {
    const term = normalized(alias);
    if (haystack.includes(term)) score += term.includes(" ") ? 8 : 5;
  }
  if (operations.some((operation) => rulePack.laborRules.some((rule) => rule.operationId === operation.id))) score += 12;
  if (operations.some((operation) => normalized(operation.system).includes(normalized(rulePack.domain === "BODYWORK" ? "body" : "transmission")))) score += 2;
  return score;
}

export function evaluateRepairAreaIntelligence(input: { query?: string; operations?: LaborRepairOperation[] }): RepairAreaIntelligenceResult {
  const query = input.query?.trim() ?? "";
  const operations = input.operations ?? [];
  const candidates = REPAIR_AREA_RULE_PACKS
    .map((rulePack) => ({ rulePack, score: scoreRulePack(rulePack, query, operations) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
  const activeRulePack = candidates[0]?.rulePack ?? null;
  const confidence = !activeRulePack ? "NONE" : candidates[0].score >= 12 ? "HIGH" : candidates[0].score >= 6 ? "MEDIUM" : "LOW";
  const summary = activeRulePack
    ? `${activeRulePack.title} opens ${activeRulePack.assembly.length} assembly zones with ${activeRulePack.partRules.length} part/OEM references and ${activeRulePack.laborRules.length} labor rules.`
    : "No repair-area rule pack matched yet.";
  return {
    activeRulePack,
    candidateRulePacks: candidates.map((candidate) => candidate.rulePack),
    confidence,
    query,
    summary,
    version: REPAIR_AREA_INTELLIGENCE_VERSION
  };
}
