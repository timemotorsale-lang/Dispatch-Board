export const BRAKE_BASELINE_VERSION = "brakes-light-duty-v1";

export type BrakeFamily = "pads" | "rotors" | "calipers" | "caliper-service" | "drums" | "drum-measurement" | "master" | "lines" | "bleeding" | "assist" | "electronic-assist" | "parking-mechanical" | "epb" | "abs" | "wheel-speed" | "stability" | "pedal" | "diagnosis" | "regeneration" | "verification" | "towing";
export type BrakeOperation = {
  id: string;
  previewId: string;
  label: string;
  title: string;
  groupId: string;
  family: BrakeFamily;
  hours: number;
  diagnosis: boolean;
  position: string;
  included: string[];
  parts: { name: string; quantity: number }[];
  applicability: string;
  excluded: string[];
  verification: string[];
  sharedAccess: string | null;
  contains: string[];
};

export const BRAKE_GROUPS = [
  { id: "friction", title: "Pads, Rotors, Drums & Calipers", label: "Pads, rotors & calipers" },
  { id: "brakes-drum", title: "Drum Brakes & Measurements", label: "Drum brakes & measurements" },
  { id: "hydraulics", title: "Hydraulics & Brake Assist", label: "Hydraulics & brake assist" },
  { id: "abs", title: "ABS, Stability & Parking Brake", label: "ABS & stability" },
  { id: "parking", title: "Mechanical & Electronic Parking Brake", label: "Parking brake" },
  { id: "brakes-electronic", title: "Electronic Assist & Regenerative Braking", label: "Electronic assist & regeneration" },
  { id: "brakes-controls", title: "Pedal Controls & Light-Truck Towing", label: "Pedal controls & towing" },
  { id: "brakes-diagnosis", title: "Symptom Diagnosis & Final Verification", label: "Symptoms & verification" }
] as const;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const operations: BrakeOperation[] = [];

function add(groupId: string, family: BrakeFamily, label: string, hours: number, options: Partial<Omit<BrakeOperation, "groupId" | "family" | "label" | "hours">> = {}) {
  const diagnosis = /^(Diagnose|Test|Inspect|Measure)/.test(label);
  const previewId = `${groupId}-${diagnosis ? "diagnosis" : "repair"}-${slug(label)}`;
  operations.push({
    id: previewId, previewId, label, title: label, groupId, family, hours, diagnosis,
    position: "One vehicle; identify the affected unit, axle and side in configuration review",
    included: diagnosis
      ? ["Confirm the concern and record initial findings", "Perform the selected test and record measurements", "Report results; repairs are not included"]
      : ["Vehicle-appropriate access for the selected unit", label, "Restore connections and verify the selected operation"],
    parts: diagnosis ? [] : [{ name: label.replace(/^(Replace|Service|Repair|Adjust|Perform|Fabricate and replace|Calibrate|Program) /, ""), quantity: 1 }],
    applicability: "Passenger automobiles and light trucks only. Confirm VIN, configuration and separately serviceable components against the applicable manufacturer procedure before quoting.",
    excluded: ["Other units, opposite-side repairs and unrelated faults", "Seized or damaged fasteners, corrosion and additional access beyond the reviewed configuration", "Extra repairs or outsourced work without separate scope and approval"],
    verification: ["Document applicable measurements and manufacturer acceptance limits", "Check connections, leaks and pedal/holding function as applicable", "Confirm safe stationary operation before any appropriate controlled road test; record results before release"],
    sharedAccess: null, contains: [], ...options
  });
}

for (const axle of ["front", "rear"]) {
  add("friction", "pads", `Replace ${axle} pads & rotors`, axle === "front" ? 2.1 : 2, {
    id: `${axle}-brake-pads-rotors`, previewId: `${axle}-pads-rotors`, title: `Replace ${axle} brake pads and rotors`, position: `${axle} axle, both sides`,
    included: ["Replace pads on both sides", "Replace both rotors", "Clean and lubricate serviceable slides and renew supplied pad hardware", "Required EPB service mode and reset where applicable", "Inspect and verify brake operation"],
    parts: [{ name: `${axle} brake pad set`, quantity: 1 }, { name: `${axle} brake rotor`, quantity: 2 }], sharedAccess: `brake-${axle}-access`, contains: [`${axle}-pads`, `${axle}-rotors`]
  });
  add("friction", "pads", `Replace ${axle} brake pads`, 1.2, { id: `${axle}-pads`, previewId: `${axle}-pads`, position: `${axle} axle, both sides`, parts: [{ name: `${axle} brake pad set`, quantity: 1 }], sharedAccess: `brake-${axle}-access`, included: ["Replace axle pad set and supplied hardware", "Clean and lubricate serviceable slides; replacement pins/boots are separate", "Required EPB service mode/reset and brake verification where applicable"] });
  add("friction", "rotors", `Replace ${axle} brake rotors`, 1.5, { id: `${axle}-rotors`, previewId: `${axle}-rotors`, position: `${axle} axle, both sides; existing pads inspected, not replaced`, parts: [{ name: `${axle} brake rotor`, quantity: 2 }], sharedAccess: `brake-${axle}-access` });
  add("friction", "rotors", `Measure ${axle} rotor thickness and runout`, 0.6, { id: `${axle}-rotor-measurement`, previewId: `${axle}-rotor-measurement`, position: `${axle} axle, both sides`, sharedAccess: `brake-${axle}-access` });
  add("friction", "rotors", `Resurface serviceable ${axle} brake rotors`, 1.4, { id: `${axle}-rotor-machining`, previewId: `${axle}-rotor-machining`, position: `${axle} axle, both sides`, parts: [], applicability: "Only where manufacturer permits machining, equipment is available, and final thickness/runout meet the vehicle-specific limits. Replace instead when outside limits.", sharedAccess: `brake-${axle}-access` });
  add("friction", "caliper-service", `Service ${axle} caliper slide pins and boots`, 0.8, { id: `${axle}-slide-service`, previewId: `${axle}-slide-service`, position: `${axle} axle, both sides`, parts: [{ name: `${axle} slide pin and boot kit`, quantity: 1 }], sharedAccess: `brake-${axle}-access` });
  add("friction", "pads", `Replace ${axle} brake pad wear sensor`, 0.5, { position: `${axle}, one separately serviceable sensor; identify side`, sharedAccess: `brake-${axle}-access` });
  add("friction", "caliper-service", `Replace ${axle} brake dust shield`, 1.5, { position: `${axle}, one shield; identify side and hub-access requirements`, sharedAccess: `brake-${axle}-access` });
  for (const side of ["left", "right"]) {
    add("friction", "calipers", `Replace ${axle} ${side} brake caliper`, 1.3, { id: `${axle}-${side}-caliper`, previewId: `${axle}-${side}-caliper`, position: `${axle} ${side}, one caliper`, sharedAccess: `brake-${axle}-access`, parts: [{ name: `${axle} ${side} brake caliper`, quantity: 1 }], included: ["Replace one caliper", "Bleed the affected circuit using the applicable procedure", "Required EPB mode/reset and leak/pedal checks; full fluid exchange is not included"] });
    add("friction", "caliper-service", `Replace ${axle} ${side} caliper bracket`, 1, { position: `${axle} ${side}, one separately serviceable bracket`, sharedAccess: `brake-${axle}-access` });
    add("friction", "caliper-service", `Replace serviceable ${axle} ${side} caliper bleeder screw`, 0.6, { position: `${axle} ${side}, one serviceable bleeder; damaged threads or seized extraction require revised scope`, sharedAccess: `brake-${axle}-access`, included: ["Replace one serviceable bleeder screw", "Bleed affected circuit and verify leak-free operation"] });
    add("friction", "caliper-service", `Overhaul serviceable ${axle} ${side} brake caliper`, 2, { position: `${axle} ${side}, one caliper`, parts: [{ name: `${axle} ${side} approved caliper rebuild kit; confirm serviceability`, quantity: 1 }], applicability: "Only if the manufacturer permits rebuilding and approved kits and inspection equipment are available. Integrated EPB/electronic units may require assembly replacement.", sharedAccess: `brake-${axle}-access`, included: ["Inspect and rebuild one permitted caliper with approved service kit", "Bleed affected circuit and verify operation"] });
  }
}
add("friction", "calipers", "Replace front brake caliper", 1.3, { id: "brake-caliper-front", position: "Front, one caliper; specify left or right before quotation", sharedAccess: "brake-front-access", included: ["Replace one caliper", "Bleed affected circuit", "Leak check and pedal verification; full fluid exchange not included"] });
add("friction", "diagnosis", "Diagnose brake noise or vibration", 0.8, { id: "brake-noise", previewId: "brake-noise" });
add("friction", "diagnosis", "Diagnose brake drag or pulling", 1, { id: "brake-drag", previewId: "brake-drag" });

for (const [family, label, hours] of [
  ["drums", "Replace rear brake shoes", 2], ["drums", "Replace rear brake drums", 1.3], ["drums", "Replace wheel cylinder", 1.2],
  ["drums", "Replace drum brake hardware", 1.5], ["drums", "Service brake shoe adjuster", 1.2], ["drums", "Replace backing plate", 2.5],
  ["drum-measurement", "Measure brake drum diameter and runout", 0.6], ["drum-measurement", "Resurface serviceable brake drums", 1.5],
  ["diagnosis", "Diagnose drum brake noise", 1], ["diagnosis", "Diagnose uneven drum brake application", 1]
] as const) add("brakes-drum", family, label, hours, { position: /shoes|drums|hardware/.test(label) ? "Rear axle, both sides" : "One drum brake unit; specify axle and side", sharedAccess: "brake-rear-access", ...(label === "Replace rear brake drums" ? { parts: [{ name: "Rear brake drum", quantity: 2 }] } : {}), ...(/Resurface/.test(label) ? { parts: [], applicability: "Manufacturer-permitted machining only; measure before and after against the vehicle-specific maximum diameter and finish limits." } : {}), ...(/wheel cylinder/.test(label) ? { included: ["Replace one wheel cylinder", "Bleed affected circuit and verify leak-free operation"] } : {}) });

for (const [family, label, hours] of [
  ["master", "Replace brake master cylinder", 1.8], ["master", "Replace brake fluid reservoir", 0.8],
  ["assist", "Replace brake booster", 3], ["assist", "Replace brake vacuum pump", 1.5], ["assist", "Replace hydroboost unit", 3],
  ["assist", "Replace brake booster vacuum hose", 0.6], ["assist", "Replace brake booster check valve", 0.5], ["assist", "Replace hydroboost pressure or return hose", 1.5],
  ["lines", "Replace brake flexible hose", 1], ["lines", "Fabricate and replace brake line", 2], ["lines", "Replace brake line fitting or union", 1], ["lines", "Replace brake proportioning valve", 1.5],
  ["bleeding", "Exchange brake fluid & bleed system", 1], ["bleeding", "Bleed affected brake hydraulic circuit", 0.7],
  ["diagnosis", "Diagnose soft pedal or fluid loss", 1], ["diagnosis", "Diagnose hard brake pedal", 1], ["diagnosis", "Diagnose brake hydraulic leak", 1], ["assist", "Test brake booster vacuum supply", 0.6]
] as const) add("hydraulics", family, label, hours, {
  ...(label === "Replace brake master cylinder" ? { id: "brake-master-cylinder" } : {}),
  ...(label === "Diagnose soft pedal or fluid loss" ? { id: "soft-pedal", previewId: "soft-pedal" } : {}),
  ...(!/^(Diagnose|Test)/.test(label) ? { sharedAccess: "brake-hydraulic-circuit", included: [label, "Required bench preparation where applicable and affected-circuit bleed", "Verify leak-free connections, fluid level and pedal function; full exchange and electronic service bleed are conditional, not automatic charges"] } : {}),
  ...(label === "Exchange brake fluid & bleed system" ? { id: "brake-fluid-service", previewId: "brake-fluid", title: "Brake fluid exchange", parts: [{ name: "Vehicle-specified brake fluid; confirm required volume", quantity: 1 }], contains: ["hydraulics-repair-bleed-affected-brake-hydraulic-circuit"], included: ["Exchange specified brake fluid and perform conventional system bleed", "Verify level, leaks and pedal function", "Electronic ABS service bleed is conditional on the applicable procedure, not automatically a separate charge"] } : {}),
  ...(family === "bleeding" && !label.startsWith("Exchange") ? { parts: [] } : {}),
  ...(family === "lines" ? { position: "One identified hose, fitting, valve or routed line section; document length, routing and axle/side" } : {})
});

for (const [family, label, hours] of [
  ["wheel-speed", "Replace wheel speed sensor", 0.9], ["wheel-speed", "Replace serviceable ABS tone ring", 1.5], ["wheel-speed", "Repair wheel speed sensor wiring or connector", 1],
  ["wheel-speed", "Inspect wheel bearing magnetic encoder", 0.8],
  ["abs", "Replace ABS hydraulic control unit", 2.8], ["abs", "Replace ABS control module", 2], ["abs", "Repair ABS wiring", 1.5],
  ["bleeding", "Perform ABS service bleed", 0.8], ["abs", "Program and initialize ABS control module", 1],
  ["stability", "Replace steering angle sensor", 1.5], ["stability", "Replace yaw rate sensor", 1], ["stability", "Replace brake pressure sensor", 1.2],
  ["stability", "Calibrate steering angle sensor", 0.7], ["stability", "Calibrate yaw and acceleration sensors", 0.7],
  ["diagnosis", "Diagnose ABS warning light", 1], ["diagnosis", "Diagnose unwanted ABS activation", 1], ["diagnosis", "Diagnose stability control warning", 1], ["diagnosis", "Diagnose wheel speed signal", 1]
] as const) add("abs", family, label, hours, {
  ...(label === "Replace wheel speed sensor" ? { id: "wheel-speed-sensor", previewId: "wheel-speed-sensor", position: "One wheel; identify axle and side" } : {}),
  ...(label === "Replace ABS hydraulic control unit" ? { id: "abs-hydraulic-unit", included: [label, "Required system/service bleed and supported initialization", "Leak, pedal and diagnostic verification"], contains: ["abs-repair-perform-abs-service-bleed", "hydraulics-repair-bleed-affected-brake-hydraulic-circuit"], sharedAccess: "brake-hydraulic-circuit" } : {}),
  ...(label === "Diagnose ABS warning light" ? { id: "abs-warning", previewId: "abs-warning" } : {}),
  ...(/^(Perform|Program|Calibrate|Inspect)/.test(label) ? { parts: [] } : {}),
  ...(family === "wheel-speed" ? { applicability: "Identify sensor/ring/encoder type and axle/side. Replace only separately serviceable parts; integrated hub/encoder replacement is cross-referenced to Tires & wheels, not included here." } : {}),
  ...(label === "Replace ABS control module" ? { included: [label, "Required supported programming/configuration and initialization", "Verify communication and ABS fault status"], contains: ["abs-repair-program-and-initialize-abs-control-module"] } : {})
});

for (const [family, label, hours] of [
  ["parking-mechanical", "Replace parking brake cable", 1.5], ["parking-mechanical", "Replace parking brake shoes", 2], ["parking-mechanical", "Replace parking brake pedal assembly", 1.5],
  ["parking-mechanical", "Replace parking brake hand lever", 1.5], ["parking-mechanical", "Replace parking brake equalizer or linkage", 1],
  ["parking-mechanical", "Replace parking brake switch", 0.5], ["parking-mechanical", "Adjust parking brake", 0.6],
  ["epb", "Replace parking brake actuator", 1.5], ["epb", "Replace electronic parking brake control module", 1.5],
  ["epb", "Perform electronic parking brake service mode", 0.4], ["epb", "Initialize electronic parking brake", 0.6],
  ["diagnosis", "Diagnose parking brake concern", 1], ["diagnosis", "Diagnose electronic parking brake fault", 1], ["diagnosis", "Diagnose parking brake holding concern", 1]
] as const) add("parking", family, label, hours, {
  ...(/^(Adjust|Perform|Initialize)/.test(label) ? { parts: [] } : {}),
  ...(label === "Replace parking brake actuator" ? { id: "parking-actuator", previewId: "parking-actuator", position: "One actuator; identify central/cable or wheel-mounted type and side", included: [label, "Required service mode and initialization", "Verify release and holding function"], contains: ["parking-repair-perform-electronic-parking-brake-service-mode", "parking-repair-initialize-electronic-parking-brake"] } : {}),
  ...(label === "Diagnose parking brake concern" ? { id: "parking-diagnosis", previewId: "parking-diagnosis" } : {})
});
add("parking", "epb", "Electronic parking brake service mode and repair", 0.8, { id: "electronic-parking-brake-service", parts: [], included: ["Service-mode entry/exit and initialization only", "Record any diagnosed component repair separately; this is not an unlimited repair allowance"], contains: ["parking-repair-perform-electronic-parking-brake-service-mode", "parking-repair-initialize-electronic-parking-brake"] });

for (const [family, label, hours] of [
  ["electronic-assist", "Replace electronic brake booster or servo assembly", 3], ["electronic-assist", "Replace integrated brake control and hydraulic assembly", 4],
  ["electronic-assist", "Replace serviceable brake pedal simulator", 2.5], ["electronic-assist", "Replace serviceable brake pressure accumulator", 2.5],
  ["regeneration", "Calibrate regenerative and friction braking coordination", 1], ["regeneration", "Diagnose regenerative braking coordination", 1.5],
  ["electronic-assist", "Diagnose electronic brake assist fault", 1.5]
] as const) add("brakes-electronic", family, label, hours, {
  applicability: "Hybrid/EV and electronic brake-by-wire configurations only. Trained staff, supported scan/programming equipment and the exact manufacturer pressure-deactivation/electrical-safety procedure are prerequisites; catalog inclusion does not confirm shop capability.",
  ...(!/^(Diagnose|Calibrate)/.test(label) ? { included: [label, "Manufacturer-required safe deactivation/reactivation, bleed and supported initialization", "Verify friction/assist function and relevant fault status"] } : { parts: [] }),
  ...(label.startsWith("Replace integrated") ? { contains: ["abs-repair-perform-abs-service-bleed", "brakes-electronic-repair-calibrate-regenerative-and-friction-braking-coordination"], sharedAccess: "brake-hydraulic-circuit" } : {})
});

for (const [family, label, hours] of [
  ["pedal", "Replace brake pedal assembly or pivot bushings", 1.5], ["pedal", "Replace brake light switch", 0.6], ["pedal", "Replace brake pedal position sensor", 0.8],
  ["pedal", "Adjust and calibrate brake pedal controls", 0.7], ["pedal", "Diagnose brake lamp or pedal signal fault", 1],
  ["towing", "Replace vehicle trailer brake controller", 1.2], ["towing", "Configure vehicle trailer brake controller", 0.7], ["towing", "Repair vehicle trailer brake output wiring", 1.5], ["towing", "Diagnose vehicle trailer brake controller output", 1]
] as const) add("brakes-controls", family, label, hours, {
  ...(/^(Adjust|Configure)/.test(label) ? { parts: [] } : {}),
  ...(family === "towing" ? { applicability: "Vehicle-installed light-truck controller/output only. Trailer axles, trailer brake assemblies, heavy-truck air brakes and trailers are outside this baseline." } : {})
});

for (const [family, label, hours] of [
  ["diagnosis", "Diagnose excessive stopping distance or brake fade", 1], ["diagnosis", "Diagnose low brake fluid warning", 0.8], ["diagnosis", "Diagnose brake pedal travel or height concern", 1],
  ["diagnosis", "Diagnose contaminated brake fluid or mixed-fluid concern", 1], ["diagnosis", "Diagnose intermittent brake warning or communication fault", 1.5],
  ["verification", "Inspect brake system and record wear measurements", 0.8], ["verification", "Perform standalone brake post-repair verification", 0.5]
] as const) add("brakes-diagnosis", family, label, hours, { parts: [], included: family === "verification" ? ["Record applicable wear/condition or post-repair results", "Check pedal, leaks, fault status and holding function as applicable", "Controlled road test only when safe and appropriate; do not charge twice when already included in selected repair"] : diagnosticScope(label) });

function diagnosticScope(label: string) {
  return ["Confirm and document the concern", label, "Record findings and next action; component replacement is not included"];
}

export const BRAKE_OPERATIONS: readonly BrakeOperation[] = operations;
export const BRAKE_COVERAGE_FAMILIES: readonly BrakeFamily[] = ["pads", "rotors", "calipers", "caliper-service", "drums", "drum-measurement", "master", "lines", "bleeding", "assist", "electronic-assist", "parking-mechanical", "epb", "abs", "wheel-speed", "stability", "pedal", "diagnosis", "regeneration", "verification", "towing"];
export const BRAKE_CROSS_REFERENCES = ["Integrated wheel bearing/hub encoder: Tires & wheels", "Steering geometry or suspension wear: Steering & suspension (next audit slice)", "Vehicle electrical supply/network faults: Electrical", "High-voltage isolation or battery faults: Hybrid & EV"];

export function brakeOperationForId(id: string) {
  const source = id.replace(/:front-(left|right)$/, "");
  return BRAKE_OPERATIONS.find(operation => operation.id === source || operation.previewId === source);
}

export function brakeScopeConflict(leftId: string, rightId: string) {
  const left = brakeOperationForId(leftId), right = brakeOperationForId(rightId);
  if (!left || !right) return false;
  if (left.id === right.id) return leftId === rightId || !leftId.includes(":front-") || !rightId.includes(":front-");
  for (const axle of ["front", "rear"]) {
    if ([left.id, right.id].includes(`${axle}-rotor-machining`) && [left.id, right.id].some(id => [`${axle}-rotors`, `${axle}-brake-pads-rotors`].includes(id))) return true;
    for (const side of ["left", "right"]) {
      if ([left.label, right.label].includes(`Replace ${axle} ${side} brake caliper`) && [left.label, right.label].includes(`Overhaul serviceable ${axle} ${side} brake caliper`)) return true;
    }
  }
  if ((left.family === "verification" && left.label.startsWith("Perform") && !right.diagnosis) || (right.family === "verification" && right.label.startsWith("Perform") && !left.diagnosis)) return true;
  const epbMode = "parking-repair-perform-electronic-parking-brake-service-mode";
  if ((left.id === epbMode && right.included.some(scope => scope.includes("EPB"))) || (right.id === epbMode && left.included.some(scope => scope.includes("EPB")))) return true;
  return left.contains.includes(right.id) || right.contains.includes(left.id)
    || (left.id === "brake-caliper-front" && ["front-left-caliper", "front-right-caliper"].includes(right.id))
    || (right.id === "brake-caliper-front" && ["front-left-caliper", "front-right-caliper"].includes(left.id));
}
