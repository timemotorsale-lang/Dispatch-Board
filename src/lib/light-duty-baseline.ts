import { BASE_REPAIR_SYSTEMS, type RawRepairOperation } from "./light-duty-catalog-data";
import { LIGHT_DUTY_ADDITIONS } from "./light-duty-catalog-additions";
import { buildLaborPlan, type LaborPlan } from "./labor-planning";

export const LIGHT_DUTY_CATALOG_VERSION = "light-duty-expansion-v1";
export const LIGHT_DUTY_IMPLEMENTATION_ORDER = [
  { order: 1, label: "Maintenance and scheduled service", systems: ["maintenance"] },
  { order: 2, label: "Engine mechanical and performance", systems: ["engine"], groups: "Excludes cooling and fuel groups assigned below" },
  { order: 3, label: "Cooling, starting/charging and electrical", systems: ["engine", "electrical"], groups: "engine-cooling and all electrical groups" },
  { order: 4, label: "Transmission, drivetrain and axles", systems: ["transmission"] },
  { order: 5, label: "HVAC, fuel, exhaust and emissions", systems: ["hvac", "engine", "exhaust"], groups: "engine-fuel and engine-diesel; all HVAC/exhaust groups" },
  { order: 6, label: "Tires/wheels, body/interior, safety/ADAS and hybrid/EV", systems: ["tires", "body", "safety", "ev"] }
] as const;

export type LightDutyOperation = {
  id: string; previewId: string; aliases: readonly string[]; label: string; title: string; systemId: string; groupId: string; family: string;
  hours: number; diagnosis: boolean; position: string; zone: string; included: string[]; excluded: string[];
  parts: { name: string; quantity: number }[]; applicability: string; verification: string[]; conditional: string[];
  sharedAccess: string | null; contains: string[]; laborPlan: LaborPlan; implementationOrder: number; keywords: string;
  reviewStatus: "AWAITING_SHOP_REVIEW"; specialistReview: boolean;
};

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
const unitKey = (text: string) => slug(text).replace(/cv-axle-shaft$/, "cv-axle");
function compactId(id: string) {
  if (id.length <= 78) return id;
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `${id.slice(0, 68)}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
const excludedGroups = new Set(["transmission-commercial", "tires-commercial", "body-commercial"]);
const originalIds: Record<string, string> = {
  "Change engine oil & filter": "oil-service", "Inspect maintenance needs": "maintenance-inspection", "Replace spark plugs": "spark-plugs", "Diagnose engine misfire": "engine-misfire",
  "Service transmission fluid": "transmission-service", "Diagnose shifting concern": "transmission-shift", "Diagnose tire or wheel vibration": "tire-vibration",
  "Replace battery": "battery", "Diagnose no-start concern": "no-start", "Replace blower motor": "blower", "Diagnose A/C performance": "ac-performance",
  "Replace oxygen sensor": "oxygen-sensor", "Diagnose emissions warning": "emissions-light", "Calibrate forward camera": "camera-calibration", "Diagnose driver assistance warning": "adas-warning",
  "Replace window regulator": "window-regulator", "Diagnose inoperative window": "window-diagnosis", "Service battery cooling circuit": "ev-coolant", "Diagnose charging concern": "ev-charge"
};

const legacyAliases: Record<string, string[]> = {
  "Change engine oil & filter": ["engine-oil-service"], "Replace engine air filter": ["engine-air-filter"], "Replace cabin air filter": ["cabin-air-filter"],
  "Replace accessory drive belt": ["serpentine-belt"], "Service transmission fluid": ["transmission-fluid-service"], "Exchange engine coolant": ["coolant-service"],
  "Replace battery": ["battery-replacement"], "Replace alternator": ["alternator-replacement"], "Replace starter motor": ["starter-replacement"], "Replace battery cable": ["battery-cable"],
  "Replace water pump": ["water-pump-replacement"], "Replace thermostat and housing": ["thermostat-replacement"], "Replace radiator": ["radiator-replacement"], "Replace radiator cooling fan": ["cooling-fan-assembly"],
  "Diagnose engine performance concern": ["engine-performance-diagnosis"], "Replace valve cover gasket": ["valve-cover-gasket"], "Replace oil pan gasket": ["oil-pan-gasket"], "Replace engine mount": ["engine-mount"], "Replace timing belt set": ["timing-belt-service"],
  "Replace ignition coil": ["ignition-coil"], "Replace in-tank fuel pump": ["fuel-pump"], "Replace throttle body": ["throttle-body"], "Replace mass airflow sensor": ["mass-airflow-sensor"],
  "Diagnose transmission or driveline concern": ["transmission-concern-diagnosis"], "Remove and reinstall transmission assembly": ["transmission-remove-install"], "Perform transmission programming and adaptive relearn": ["transmission-programming-relearn"],
  "Replace transmission pan gasket": ["transmission-pan-gasket"], "Service transfer-case fluid": ["transfer-case-service"], "Replace CV axle shaft": ["cv-axle"], "Service differential oil": ["differential-service"], "Replace universal joint": ["u-joint"],
  "Replace A/C compressor": ["ac-compressor-replacement"], "Replace A/C condenser": ["ac-condenser"], "Replace A/C evaporator": ["ac-evaporator"], "Replace blower motor": ["blower-motor"], "Replace blend door actuator": ["blend-door-actuator"], "Replace heater core": ["heater-core"],
  "Replace headlamp assembly": ["headlamp-assembly"], "Replace door lock actuator": ["door-lock-actuator"], "Repair damaged wiring harness": ["wire-repair"], "Perform control module programming": ["module-programming"],
  "Calibrate forward camera": ["adas-camera-calibration"], "Calibrate radar sensor": ["radar-calibration"], "Replace oxygen sensor": ["oxygen-sensor-replacement"], "Replace catalytic converter": ["catalytic-converter"], "Replace muffler": ["muffler"],
  "Replace EVAP purge valve": ["evap-purge-valve"], "Replace EGR valve": ["egr-valve"], "Replace DEF pump": ["def-pump"], "Replace windshield": ["windshield-replacement"], "Replace door glass": ["window-glass"],
  "Replace door shell": ["door-shell"], "Replace front bumper cover": ["bumper-cover-front"], "Replace fender": ["fender-replacement"], "Refinish exterior panel": ["panel-refinish"], "Structural measurement and setup": ["structural-measure"], "Replace wheel bearing / hub assembly": ["wheel-hub-bearing"],
  "Perform documented high-voltage isolation and restoration": ["hv-disable-enable"], "Service battery cooling circuit": ["hv-battery-cooling-service"], "Replace charge port assembly": ["charge-port"]
};

export function lightDutyImplementationOrder(systemId: string, groupId: string) {
  if (systemId === "maintenance") return 1;
  if (systemId === "engine") return groupId === "engine-cooling" ? 3 : ["engine-fuel", "engine-diesel"].includes(groupId) ? 5 : 2;
  if (systemId === "electrical") return 3;
  if (systemId === "transmission") return 4;
  if (["hvac", "exhaust"].includes(systemId)) return 5;
  return 6;
}

function additionRows(text: string, groupId: string, kind: "repair" | "diagnosis"): RawRepairOperation[] {
  return text.trim().split("\n").filter(Boolean).map(row => {
    const [label, allowance] = row.trim().split("|");
    const id = `${groupId}-${kind}-${slug(label)}`;
    return { id, label, kind, hours: Number(allowance), parts: null, keywords: label, includes: [] };
  });
}

export const LIGHT_DUTY_SYSTEMS = BASE_REPAIR_SYSTEMS.filter(system => !["brakes", "steering"].includes(system.id)).map(system => {
  const groups = system.groups.filter(group => !excludedGroups.has(group.id)).map(group => ({ ...group, label: group.id === "electrical-trailer" ? "Light-truck tow-vehicle wiring" : group.label, operations: group.operations.map(operation => ({ ...operation })) }));
  for (const addition of LIGHT_DUTY_ADDITIONS.filter(item => item.systemId === system.id)) {
    let group = groups.find(item => item.id === addition.groupId);
    if (!group) { group = { id: addition.groupId, label: addition.label ?? addition.groupId, operations: [] }; groups.push(group); }
    for (const operation of [...additionRows(addition.repairs, group.id, "repair"), ...additionRows(addition.diagnostics, group.id, "diagnosis")]) {
      const existing = group.operations.find(item => unitKey(item.label) === unitKey(operation.label));
      if (existing) { existing.hours = operation.hours; existing.aliases = [...new Set([...(existing.aliases ?? []), operation.id])]; existing.keywords += ` ${operation.label}`; }
      else group.operations.push(operation);
    }
  }
  return { id: system.id, label: system.label, groups };
});

const safety: Record<string, string> = {
  maintenance: "Verify VIN-specific interval, fluid specification and severe-use schedule; no universal mileage package.",
  engine: "Confirm engine code, access route, lifting/support equipment, fuel/heat/pressure hazards and supplied assembly contents. Do not operate an unsafe engine.",
  transmission: "Confirm gearbox code, drive layout, lifting/support equipment, fluid specification, temperature-dependent fill and adaptation prerequisites.",
  electrical: "Confirm low-voltage architecture, circuit protection, wiring documentation and battery support. Never apply generic electrical tests to HV or pyrotechnic circuits.",
  hvac: "Identify refrigerant and circuit; refrigerant work requires appropriately certified personnel and equipment. Electric compressors/heat pumps also require platform-specific HV capability review.",
  exhaust: "Confirm emissions configuration and lawful repair; no emissions defeat. Exhaust heat, carbon monoxide and regeneration hazards require controlled procedures.",
  tires: "Confirm tire load/speed rating, wheel design, repairability, axle/side, mounting capability and approved inflation/torque procedure. Unsafe assemblies require referral.",
  safety: "Restraint and ADAS work requires exact manufacturer procedures, qualified personnel and approved equipment. No bypasses, unsafe probing or reused deployed pyrotechnic parts.",
  body: "Identify body style, opening/side and water/SRS/sensor exposure. Structural, refinish, glass or coding scope may require a separately reviewed specialist.",
  ev: "Qualified platform-specific HV personnel and equipment are required; follow isolation/restoration and damage-handling procedures. Damaged battery or unavailable capability means specialist referral, not automatic execution."
};

function partsFor(label: string, diagnosis: boolean) {
  if (diagnosis || /^(Perform|Calibrate|Program|Record|Verify|Inspect|Test|Diagnose|Reset|Measure|Set |Lubricate)/.test(label)) return [];
  if (/^(Remove|Transfer)/.test(label)) return [{ name: "Removal/reinstallation materials allowance — verify seals, fluid specification, actual quantity and single-use hardware; no replacement assembly assumed", quantity: 1 }];
  const component = label.replace(/^(Replace|Repair|Service|Exchange|Clean|Drain and clean|Vacuum-fill and bleed|Recover and identify) /, "");
  return [{ name: `${component} — VIN-specific item/material allowance; verify supplied contents and actual quantity`, quantity: 1 }];
}

function sharedAccessFor(groupId: string, label: string) {
  if (["engine-assembly", "engine-head", "engine-bottom", "engine-timing", "engine-lubrication"].includes(groupId)) return "engine-mechanical-access";
  if (["transmission-sample", "transmission-cvt", "transmission-manual"].includes(groupId)) return "transmission-removal-access";
  if (/heater core|evaporator|air distribution housing|instrument panel/.test(label.toLowerCase())) return "instrument-panel-access";
  if (["hvac-refrigerant", "hvac-heatpump"].includes(groupId)) return "refrigerant-circuit-access";
  return groupId;
}

export const LIGHT_DUTY_OPERATIONS: readonly LightDutyOperation[] = LIGHT_DUTY_SYSTEMS.flatMap(system => system.groups.flatMap(group => group.operations.map(raw => {
  const id = originalIds[raw.label] ?? compactId(raw.id);
  const diagnosis = raw.kind === "diagnosis";
  const basePlan = buildLaborPlan(raw, group.id);
  const scope = "One identified unit/circuit or explicitly named package; record axle, side/bank, quantity, configuration and supplied contents. Not a VIN-specific time.";
  const specialistReview = ["safety", "ev"].includes(system.id) || system.id === "hvac" || /refinish|structural|high.voltage|pyrotechnic|airbag/i.test(raw.label);
  return {
    id, previewId: id, aliases: [...new Set([raw.id, ...(raw.aliases ?? []), ...(legacyAliases[raw.label] ?? [])].filter(alias => alias !== id))], label: raw.label, title: raw.label, systemId: system.id, groupId: group.id, family: group.id,
    hours: basePlan.hours, diagnosis, position: scope, zone: raw.label.match(/\b(front|rear) (left|right)\b/)?.[0].replace(" ", "-") ?? "unspecified",
    included: diagnosis ? ["Confirm and document this concern", "Perform only the selected initial test scope and record findings", "Report findings and next authorized diagnostic step; no component replacement is implied"] : ["Access and restore connections for the specifically selected unit", raw.label, "Applicable basic operating/leak checks; document results"],
    excluded: ["Additional failed components, seized/damaged fasteners, machining and corrosion remediation unless explicitly scoped", "Unlisted fluids, programming, calibration, specialist services and deeper diagnosis; select only justified work", "Duplicate standalone charges for access or checks already included in a package"],
    parts: partsFor(raw.label, diagnosis), applicability: safety[system.id],
    verification: ["Record applicable manufacturer procedure and acceptance limits", "Confirm required leak, electrical/mechanical, fault and operating checks for the selected scope", "Only perform a road/load test when the vehicle is safe and prerequisites are satisfied"],
    conditional: [safety[system.id], "Review fluid/material specifications and actual quantities, one-time-use hardware, shared access and any commissioning or calibration; included work is not separately chargeable", "Unavailable training, equipment or procedure requires referral or hold, not assumed capability"],
    sharedAccess: sharedAccessFor(group.id, raw.label), contains: [], laborPlan: { ...basePlan, basis: "WORK_BREAKDOWN" as const, scope: `${scope} Internal unvalidated planning allowance; stage allocation is illustrative, not technician observations.` },
    implementationOrder: lightDutyImplementationOrder(system.id, group.id), reviewStatus: "AWAITING_SHOP_REVIEW" as const, specialistReview, keywords: `${raw.keywords} ${id === "engine-misfire" ? "P0300 P0301 rough idle shaking" : ""}`
  };
})));

const operationIndex = new Map(LIGHT_DUTY_OPERATIONS.flatMap(operation => [...new Set([operation.id, ...operation.aliases])].map(id => [id, operation] as const)));

export function lightDutyOperationForId(id: string) {
  return operationIndex.get(id.replace(/:front-(left|right)$/, ""));
}

const assemblyAlternatives = new Set(["Replace engine assembly", "Replace complete dressed engine assembly", "Replace engine long block", "Replace engine short block", "Remove and reinstall engine assembly", "Overhaul engine assembly"]);
const transmissionAlternatives = new Set(["Replace automatic transmission assembly", "Overhaul automatic transmission", "Remove and reinstall transmission assembly", "Replace CVT assembly", "Replace dual-clutch transmission assembly", "Replace manual transmission assembly", "Overhaul manual gearbox"]);

export function lightDutyScopeConflict(leftId: string, rightId: string) {
  const left = lightDutyOperationForId(leftId), right = lightDutyOperationForId(rightId);
  if (!left || !right) return false;
  const zone = (id: string, operation: LightDutyOperation) => id.match(/:front-(left|right)$/)?.[0].slice(1) ?? operation.zone;
  const leftZone = zone(leftId, left), rightZone = zone(rightId, right);
  const sameUnit = leftZone === "unspecified" || rightZone === "unspecified" || leftZone === rightZone;
  if (!sameUnit) return false;
  if (left.id === right.id) return true;
  if (/^Replace .*CV axle( shaft)?$/.test(left.label) && /^Replace .*CV axle( shaft)?$/.test(right.label)) return true;
  if ((left.aliases.includes("wheel-hub-bearing") || right.aliases.includes("wheel-hub-bearing")) && left.groupId === "tires-hubs" && right.groupId === "tires-hubs" && !left.diagnosis && !right.diagnosis) return true;
  if (assemblyAlternatives.has(left.label) && assemblyAlternatives.has(right.label)) return true;
  if (transmissionAlternatives.has(left.label) && transmissionAlternatives.has(right.label)) return true;
  for (const [packageOperation, component] of [[left, right], [right, left]]) {
    if (packageOperation.diagnosis || component.diagnosis) continue;
    if (["Replace engine long block", "Replace engine assembly", "Replace complete dressed engine assembly"].includes(packageOperation.label) && component.label === "Transfer reusable accessories to replacement long block") return true;
    if (packageOperation.label === "Replace oil pan" && component.label === "Replace oil pan gasket") return true;
    if (["Replace engine assembly", "Replace complete dressed engine assembly", "Replace engine long block", "Overhaul engine assembly"].includes(packageOperation.label) && ["engine-head", "engine-bottom", "engine-timing"].includes(component.groupId) && /^(Replace|Overhaul|Set engine)/.test(component.label)) return true;
    if (packageOperation.label === "Replace engine short block" && component.groupId === "engine-bottom" && /crankshaft|connecting rod|piston|main bearing|engine block|bedplate/.test(component.label.toLowerCase())) return true;
    if (packageOperation.label === "Replace both cylinder head gaskets" && /Replace (left|right)? ?cylinder head gasket/.test(component.label)) return true;
    if (packageOperation.label === "Replace clutch kit with flywheel package" && ["Replace clutch kit", "Replace flywheel", "Replace clutch release bearing"].includes(component.label)) return true;
    if (packageOperation.label === "Replace timing belt water pump package" && ["Replace timing belt set", "Replace timing belt with tensioner and guide pulleys", "Replace water pump"].includes(component.label)) return true;
    if (packageOperation.label === "Replace A/C condenser with receiver-drier package" && ["Replace A/C condenser", "Replace receiver-drier", "Replace accumulator"].includes(component.label)) return true;
    if (packageOperation.label === "Replace heater core with instrument panel removal package" && ["Replace heater core", "Remove and reinstall instrument panel"].includes(component.label)) return true;
  }
  return false;
}

export const LIGHT_DUTY_COVERAGE = LIGHT_DUTY_SYSTEMS.flatMap(system => system.groups.map(group => ({ systemId: system.id, system: system.label, groupId: group.id, group: group.label, implementationOrder: lightDutyImplementationOrder(system.id, group.id), operations: LIGHT_DUTY_OPERATIONS.filter(operation => operation.systemId === system.id && operation.groupId === group.id).length, reviewStatus: "AWAITING_SHOP_REVIEW" as const })));

export function laborSystemIdForLightDuty(operation: LightDutyOperation) {
  if (operation.groupId === "engine-cooling") return "cooling";
  if (operation.groupId === "electrical-sample") return "starting-charging";
  return ({ transmission: "transmission-drivetrain", tires: "transmission-drivetrain", electrical: "electrical-adas", safety: "electrical-adas", exhaust: "exhaust-emissions", body: "body-collision", ev: "hybrid-ev" } as Record<string, string>)[operation.systemId] ?? operation.systemId;
}
