export const STEERING_BASELINE_VERSION = "steering-light-duty-v1";

export type SteeringFamily = "control-arms" | "ball-joints" | "bushings" | "knuckles" | "subframes" | "rack-linkage" | "hydraulic-assist" | "electric-assist" | "column" | "shocks-struts" | "springs" | "stabilizers" | "rear-links" | "air-suspension" | "adaptive-damping" | "alignment" | "diagnosis" | "verification";
export type SteeringOperation = {
  id: string; previewId: string; aliases: readonly string[]; label: string; title: string; groupId: string; family: SteeringFamily;
  hours: number; diagnosis: boolean; position: string; zone: string; included: string[];
  parts: { name: string; quantity: number }[]; applicability: string; excluded: string[]; verification: string[];
  sharedAccess: string | null; contains: string[]; conditional: string[];
};

export const STEERING_GROUPS = [
  { id: "steering-sample", title: "Control Arms, Joints & Carriers", label: "Control arms & joints" },
  { id: "steering-rear", title: "Rear Links, Arms & Subframes", label: "Rear links & subframes" },
  { id: "steering-rack", title: "Steering Gear & Linkage", label: "Steering gear & linkage" },
  { id: "steering-assist", title: "Hydraulic & Electric Steering Assist", label: "Power steering & electronic assist" },
  { id: "steering-struts", title: "Shocks, Struts & Springs", label: "Shocks, struts & springs" },
  { id: "steering-stabilizer", title: "Stabilizers & Bushings", label: "Stabilizer bars & bushings" },
  { id: "steering-air", title: "Air Suspension & Adaptive Damping", label: "Air suspension & adaptive damping" },
  { id: "steering-column", title: "Steering Column & Wheel", label: "Steering column & wheel" },
  { id: "steering-alignment", title: "Alignment & Geometry", label: "Alignment & geometry" },
  { id: "steering-diagnosis", title: "Symptoms & Final Verification", label: "Symptoms & verification" }
] as const;

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
const operations: SteeringOperation[] = [];
type Options = Partial<Omit<SteeringOperation, "groupId" | "family" | "label" | "hours">>;

function add(groupId: string, family: SteeringFamily, label: string, hours: number, options: Options = {}) {
  const diagnosis = /^(Diagnose|Inspect|Test|Trace|Measure)/.test(label);
  const previewId = `${groupId}-${diagnosis ? "diagnosis" : "repair"}-${slug(label)}`;
  const noParts = diagnosis || /^(Perform|Calibrate|Program|Adjust|Configure|Bleed|Verify)/.test(label);
  operations.push({
    id: previewId, previewId, aliases: [], label, title: label, groupId, family, hours, diagnosis,
    position: "One selected unit; identify axle, side, suspension design and quantity before quotation", zone: "unspecified",
    included: diagnosis ? ["Confirm concern and operating conditions", "Perform the selected test and record findings", "Report next action; component repairs are separate"] : ["Vehicle-appropriate access for one selected unit", label, "Restore connections and perform applicable stationary checks"],
    parts: noParts ? [] : [{ name: label.replace(/^(Replace|Repair|Service) /, ""), quantity: 1 }],
    applicability: "Passenger automobiles and light trucks only. Verify VIN, chassis/drive configuration, separately serviceable components and manufacturer procedure; catalog availability does not confirm shop equipment or training.",
    excluded: ["Other units, opposite-side work and unrelated faults", "Seized fasteners, corrosion, damaged mountings and extra access beyond the reviewed configuration", "Wheel alignment, ADAS calibration and additional repairs unless explicitly selected and reviewed"],
    verification: ["Record applicable play, condition or geometry measurements against vehicle-specific limits", "Confirm secure connections, unrestricted motion and correct ride-height loading/fastener procedure where applicable", "Check steering/assist and safe stationary function before any appropriate controlled road test; document results before release"],
    sharedAccess: null, contains: [], conditional: ["Review alignment and steering-angle/ADAS requirements against the exact procedure; do not automatically add charges", "Confirm one-time-use hardware, seals and fluid specification/quantity before pricing"], ...options
  });
}

add("steering-sample", "control-arms", "Replace lower control arm", 2.4, { id: "control-arm", previewId: "control-arm", zone: "front", position: "One front lower arm; specify left/right and whether supplied bushings/joint are included", sharedAccess: "front-suspension" });
add("steering-sample", "diagnosis", "Diagnose suspension noise", 1, { id: "suspension-noise", previewId: "suspension-noise", aliases: ["clunk rattle bump bouncy suspension"] });
for (const side of ["left", "right"]) {
  add("steering-sample", "control-arms", `Replace front ${side} upper control arm`, 2, { zone: `front-${side}`, position: `Front ${side}, one upper arm; identify supplied joint/bushings`, sharedAccess: "front-suspension" });
  add("steering-sample", "ball-joints", `Replace front ${side} upper ball joint`, 1.8, { zone: `front-${side}`, position: `Front ${side}, one separately serviceable upper joint`, sharedAccess: "front-suspension" });
  add("steering-sample", "control-arms", `Replace front ${side} lower control arm`, 2.4, { id: `front-${side}-lower-control-arm`, zone: `front-${side}`, position: `Front ${side}, one lower arm; supplied joint/bushings must be identified`, sharedAccess: `front-${side}-suspension` });
  add("steering-sample", "ball-joints", `Replace ${side} lower ball joint`, 1.8, { zone: `front-${side}`, position: `Front ${side}, one separately serviceable lower joint`, sharedAccess: `front-${side}-suspension` });
  add("steering-sample", "control-arms", `Replace front ${side} complete lower arm with joint and bushings`, 2.4, { zone: `front-${side}`, position: `Front ${side}, one complete supplied lower arm`, sharedAccess: `front-${side}-suspension`, included: ["Replace one complete lower arm with supplied joint and bushings", "Use manufacturer-specified loading and fastening procedure", "Verify motion and review alignment needs"], parts: [{ name: `Front ${side} complete lower arm with joint and bushings`, quantity: 1 }] });
}
for (const [family, label, hours] of [
  ["control-arms", "Replace upper control arm", 2], ["bushings", "Replace control arm bushing", 2], ["knuckles", "Replace steering knuckle", 3],
  ["subframes", "Replace suspension subframe", 6], ["ball-joints", "Replace upper ball joint", 1.8], ["bushings", "Replace suspension subframe bushing", 3],
  ["bushings", "Replace control arm pivot bolt or eccentric", 1.2], ["diagnosis", "Inspect suspension joint play", 0.8], ["diagnosis", "Diagnose abnormal suspension geometry", 1.5]
] as const) add("steering-sample", family, label, hours, { zone: "front", sharedAccess: "front-suspension", ...(label === "Replace control arm bushing" ? { position: "One separately serviceable front lower-arm bushing; specify side and pivot" } : {}), ...(family === "subframes" ? { conditional: ["Confirm support equipment, drivetrain/battery access, alignment and any required calibrations", "Additional access must be scoped and priced for the actual vehicle"] } : {}) });
add("steering-sample", "ball-joints", "Replace front ball joint", 1.8, { id: "front-ball-joint", zone: "front", position: "One front joint; specify upper/lower and left/right", sharedAccess: "front-suspension" });

for (const [family, label, hours] of [
  ["rear-links", "Replace rear control arm", 1.8], ["rear-links", "Replace suspension trailing arm", 2], ["rear-links", "Replace rear toe link", 1.5],
  ["rear-links", "Replace track bar", 1.5], ["rear-links", "Replace rear camber link", 1.5], ["rear-links", "Replace rear lateral link", 1.5],
  ["bushings", "Replace rear suspension link bushing", 2], ["subframes", "Replace rear suspension subframe", 6], ["bushings", "Replace rear subframe mounting bushing", 3],
  ["rear-links", "Replace rear suspension knuckle", 3], ["diagnosis", "Diagnose rear suspension clunk or rear steer", 1], ["diagnosis", "Inspect rear suspension link play", 0.8]
] as const) add("steering-rear", family, label, hours, { zone: "rear", sharedAccess: "rear-suspension", ...(label === "Replace rear control arm" ? { id: "rear-control-arm" } : {}), ...(["Replace suspension trailing arm", "Replace rear toe link", "Replace track bar"].includes(label) ? { aliases: [`steering-stabilizer-repair-${slug(label)}`] } : {}) });

for (const [label, hours] of [
  ["Replace steering rack assembly", 4.2], ["Replace steering gearbox", 4], ["Replace inner tie rod", 1.5], ["Replace outer tie rod end", 0.9],
  ["Replace steering rack boot", 1], ["Replace pitman arm", 1.5], ["Replace idler arm", 1.2], ["Replace drag link", 1.5], ["Replace intermediate steering shaft", 1.5],
  ["Replace steering rack mounting bushing", 1.5], ["Replace steering center link", 1.5], ["Replace steering damper", 1],
  ["Diagnose steering free play", 1], ["Diagnose binding steering", 1], ["Diagnose steering pull", 1]
] as const) add("steering-rack", /^(Diagnose)/.test(label) ? "diagnosis" : "rack-linkage", label, hours, {
  zone: "front", sharedAccess: "steering-linkage",
  ...(label === "Replace steering rack assembly" ? { id: "rack-pinion", title: "Replace steering rack and pinion", included: ["Replace one steering gear; identify supplied tie rods/boots and hydraulic or electric configuration", "Required hydraulic bleed or supported electronic initialization as applicable", "Verify assist, leaks, communication and travel; alignment separately reviewed"] } : {}),
  ...(label === "Replace outer tie rod end" ? { id: "outer-tie-rod" } : {})
});
add("steering-rack", "electric-assist", "Replace complete electric steering rack with motor and module", 4.2, { zone: "front", position: "One complete supplied EPS rack, motor and control module", sharedAccess: "steering-linkage", parts: [{ name: "Complete vehicle-specific EPS rack with motor and module", quantity: 1 }], included: ["Replace supplied complete EPS rack/motor/module assembly", "Required supported programming, configuration and initialization", "Verify assist, travel and faults; alignment separately reviewed"] });
for (const side of ["left", "right"]) {
  for (const unit of ["inner tie rod", "outer tie rod end"]) add("steering-rack", "rack-linkage", `Replace front ${side} ${unit}`, unit.startsWith("inner") ? 1.5 : 0.9, { zone: `front-${side}`, position: `Front ${side}, one ${unit}`, sharedAccess: "steering-linkage" });
  add("steering-rear", "rear-links", `Replace rear ${side} control arm`, 1.8, { zone: `rear-${side}`, position: `Rear ${side}, one identified control arm; specify upper/lower or link type`, sharedAccess: "rear-suspension" });
  add("steering-rear", "rear-links", `Replace rear ${side} toe link`, 1.5, { zone: `rear-${side}`, position: `Rear ${side}, one toe link`, sharedAccess: "rear-suspension" });
}
for (const [family, label, hours] of [
  ["hydraulic-assist", "Replace power steering pump", 2], ["hydraulic-assist", "Replace power steering pressure hose", 1.5], ["hydraulic-assist", "Replace power steering return hose", 1],
  ["hydraulic-assist", "Replace power steering reservoir", 0.8], ["hydraulic-assist", "Replace power steering cooler", 1.5], ["hydraulic-assist", "Replace power steering suction hose", 1],
  ["hydraulic-assist", "Service power steering fluid", 0.8], ["hydraulic-assist", "Bleed power steering hydraulic circuit", 0.6],
  ["electric-assist", "Replace electric steering motor", 2], ["electric-assist", "Replace electric steering control module", 1.5], ["electric-assist", "Perform steering assist calibration", 1],
  ["electric-assist", "Repair electric steering wiring or connector", 1.5], ["electric-assist", "Program electric steering control module", 1],
  ["diagnosis", "Diagnose loss of steering assist", 1], ["diagnosis", "Trace power steering leak", 1], ["diagnosis", "Diagnose electric steering warning", 1], ["diagnosis", "Test steering assist supply and ground", 0.8]
] as const) add("steering-assist", family, label, hours, {
  sharedAccess: family === "hydraulic-assist" ? "steering-hydraulics" : family === "electric-assist" ? "steering-electronics" : null,
  ...(family === "hydraulic-assist" && label.startsWith("Replace") ? { included: [label, "Restore affected fluid connections and perform required circuit bleed", "Verify assist and leak-free operation; full fluid exchange is separate if justified"] } : {}),
  ...(family === "electric-assist" ? { applicability: "Separately serviceable EPS/EPAS unit only. Supported programming tools, electrical-safety procedure and trained staff are required; an integrated motor may require complete rack/column replacement.", ...(!/^(Perform|Program)/.test(label) ? { included: [label, "Required supported configuration/initialization", "Verify communication, assist and relevant fault status"] } : {}) } : {}),
  ...(label === "Service power steering fluid" ? { parts: [{ name: "Vehicle-specified power steering fluid; confirm volume", quantity: 1 }] } : {}),
  ...(label.startsWith("Bleed") ? { parts: [] } : {})
});

for (const side of ["left", "right"]) {
  add("steering-struts", "shocks-struts", `Replace front ${side} strut assembly`, 1.7, { zone: `front-${side}`, position: `Front ${side}, one damper/strut; existing serviceable spring/mount transferred, not renewed`, sharedAccess: `front-${side}-strut` });
  add("steering-struts", "shocks-struts", `Replace front ${side} complete loaded strut`, 1.7, { zone: `front-${side}`, position: `Front ${side}, one supplied complete assembly including spring and mount`, sharedAccess: `front-${side}-strut`, included: ["Replace one preassembled strut including supplied spring, mount and isolators", "Verify seating, connections and motion", "Review alignment and calibration requirements"], parts: [{ name: `Front ${side} loaded strut with spring and mount`, quantity: 1 }] });
  add("steering-struts", "shocks-struts", `Replace rear ${side} shock absorber`, 1.1, { zone: `rear-${side}`, position: `Rear ${side}, one shock`, sharedAccess: `rear-${side}-damper` });
  add("steering-struts", "shocks-struts", `Replace front ${side} shock absorber`, 1.1, { zone: `front-${side}`, position: `Front ${side}, one separate shock; not a strut assembly` });
  add("steering-struts", "shocks-struts", `Replace rear ${side} strut assembly`, 1.8, { zone: `rear-${side}`, position: `Rear ${side}, one strut; existing spring/mount transferred` });
}
add("steering-struts", "shocks-struts", "Replace front strut assemblies - both sides", 3.4, { id: "front-strut-assembly", zone: "front", position: "Front axle, both struts; existing serviceable springs/mounts transferred", parts: [{ name: "Front strut damper; confirm left/right fitment", quantity: 2 }], sharedAccess: "front-suspension" });
add("steering-struts", "shocks-struts", "Replace rear shock absorbers - both sides", 2.2, { id: "rear-shock-absorbers-both-sides", zone: "rear", position: "Rear axle, both shocks", parts: [{ name: "Rear shock absorber; confirm left/right fitment", quantity: 2 }], sharedAccess: "rear-suspension" });
for (const [family, label, hours] of [["springs", "Replace rear coil spring", 2], ["springs", "Replace rear spring isolator", 1.8], ["shocks-struts", "Replace rear strut mount", 2.5], ["shocks-struts", "Replace rear strut bearing", 2.5]] as const) add("steering-struts", family, label, hours, { zone: "rear", position: "Rear, one separately serviceable unit; specify side and suspension design", sharedAccess: "rear-suspension", applicability: "Manufacturer-permitted component service only. Stored spring energy requires approved support/compression equipment and trained staff." });
for (const [family, label, hours] of [
  ["shocks-struts", "Replace strut mount", 2.5], ["springs", "Replace coil spring", 2], ["springs", "Replace leaf spring", 3], ["springs", "Replace spring shackle", 1.5],
  ["springs", "Replace spring hanger", 2], ["springs", "Replace bump stop", 1], ["springs", "Replace spring isolator", 1.8], ["shocks-struts", "Replace strut bearing", 2.5],
  ["shocks-struts", "Replace damper dust boot and jounce bumper", 2], ["springs", "Replace leaf spring U-bolt set", 1.5], ["springs", "Replace torsion bar", 3], ["springs", "Replace torsion bar adjuster", 2],
  ["diagnosis", "Diagnose excessive bounce", 1], ["diagnosis", "Diagnose suspension sag", 1], ["diagnosis", "Diagnose strut mount noise", 1]
] as const) add("steering-struts", family, label, hours, {
  ...(label === "Replace strut mount" || label === "Replace strut bearing" || label === "Replace coil spring" ? { zone: "front", position: "One front unit; specify side and spring/strut design", sharedAccess: "front-suspension" } : {}),
  ...(!label.startsWith("Diagnose") ? { applicability: "Confirm separately serviceable part and actual spring/damper design. Stored spring/torsion energy requires approved support/compression equipment and trained staff; structural hanger repair needs separately reviewed capability and scope." } : {})
});

for (const [label, hours] of [["Replace front stabilizer link", 0.7], ["Replace rear stabilizer link", 0.5], ["Replace stabilizer bar bushing", 1], ["Replace stabilizer bar", 2], ["Replace active anti-roll actuator", 3], ["Calibrate active anti-roll system", 1], ["Diagnose stabilizer link noise", 1], ["Diagnose excessive body roll", 1]] as const) add("steering-stabilizer", label.startsWith("Diagnose") ? "diagnosis" : "stabilizers", label, hours, { ...(label.startsWith("Replace front") ? { zone: "front" } : label.startsWith("Replace rear") ? { zone: "rear" } : {}), ...(label.includes("active") ? { applicability: "Active anti-roll equipped vehicle only; confirm pressure/electrical deactivation procedure, tools and training before offering in-house work." } : {}) });
add("steering-stabilizer", "stabilizers", "Replace rear sway bar links", 0.9, { id: "rear-sway-bar-links", zone: "rear", position: "Rear axle, both stabilizer links", parts: [{ name: "Rear stabilizer link; verify left/right fitment", quantity: 2 }] });

for (const [family, label, hours] of [
  ["air-suspension", "Replace air spring", 2], ["air-suspension", "Replace air suspension compressor", 2], ["air-suspension", "Replace air suspension valve block", 1.5],
  ["air-suspension", "Replace ride height sensor", 0.8], ["air-suspension", "Repair suspension air line", 1.5], ["air-suspension", "Calibrate suspension ride height", 1],
  ["air-suspension", "Replace suspension air reservoir", 1.5], ["air-suspension", "Service suspension compressor dryer", 1], ["air-suspension", "Replace ride height sensor linkage", 0.7],
  ["adaptive-damping", "Replace adaptive damper", 2], ["adaptive-damping", "Replace suspension control module", 1.5], ["adaptive-damping", "Program suspension control module", 1],
  ["adaptive-damping", "Repair adaptive damper wiring", 1.5], ["diagnosis", "Diagnose air suspension leak", 1], ["diagnosis", "Diagnose suspension compressor concern", 1], ["diagnosis", "Diagnose adaptive damping warning", 1]
] as const) add("steering-air", family, label, hours, {
  applicability: "Passenger/light-truck air, self-leveling or adaptive suspension only—not heavy commercial pneumatic systems. Verify supported lift/service mode, pressure deactivation, electrical precautions and calibration tools before work.",
  conditional: ["Review whether ride-height calibration, alignment or ADAS checks are required; select only justified additional scope", "Leak-test, confirm normal height and scan as applicable before any safe road test"],
  ...(label.startsWith("Repair") ? { position: "One identified line section or circuit; specify length, routing and fittings" } : {})
});

for (const [label, hours] of [
  ["Replace steering column", 2.5], ["Replace steering column bearing", 2], ["Replace steering wheel", 1], ["Replace tilt or telescope actuator", 1.5], ["Replace steering column lock", 2],
  ["Replace steering column coupling", 1.5], ["Diagnose steering column noise", 1], ["Diagnose steering wheel adjustment concern", 1]
] as const) add("steering-column", label.startsWith("Diagnose") ? "diagnosis" : "column", label, hours, { applicability: "Confirm column/shaft design and separately serviceable units. Follow vehicle-specific restraint-system and clock-spring centering precautions; SRS repairs are cross-referenced, not included." });

for (const [label, hours, options] of [
  ["Perform four-wheel alignment", 1.2, { id: "four-wheel-alignment", title: "Four-wheel alignment", aliases: ["wheel-alignment"], position: "One vehicle, all four wheels; adjust available factory angles" }],
  ["Perform front-wheel alignment", 1, { aliases: ["tires-sample-repair-perform-front-wheel-alignment"], position: "One vehicle, front-wheel alignment only" }],
  ["Adjust wheel alignment angles", 1, { aliases: ["tires-sample-repair-adjust-wheel-alignment-angles"], position: "Selected available angles; document axle and adjusted scope" }],
  ["Measure wheel alignment without adjustment", 0.7, { position: "One vehicle, measurement/report only" }],
  ["Replace serviceable alignment cam bolt or shim", 1.2, {}], ["Diagnose alignment outside adjustment range", 1, {}]
] as const) add("steering-alignment", label.startsWith("Diagnose") ? "diagnosis" : "alignment", label, hours, { parts: [], sharedAccess: "wheel-alignment", ...options, ...(/Replace/.test(label) ? { parts: [{ name: "Vehicle-approved alignment cam bolt or shim; specify location", quantity: 1 }] } : {}), included: label.startsWith("Diagnose") ? ["Record geometry and available adjustment", "Identify likely damaged/worn or non-adjustable components; repairs separate"] : [label, "Record before/after measurements or measurement-only findings as selected", "Identify remaining out-of-spec conditions; hardware repairs and ADAS calibration are not included"] });

for (const [family, label, hours] of [
  ["diagnosis", "Diagnose steering wheel off-center", 1], ["diagnosis", "Diagnose steering wander or poor return", 1], ["diagnosis", "Diagnose ride vibration or harshness", 1],
  ["diagnosis", "Inspect steering and suspension after impact", 1.5], ["verification", "Perform standalone steering and suspension verification", 0.5]
] as const) add("steering-diagnosis", family, label, hours, { parts: [], included: ["Record concern or post-repair findings against applicable limits", "Confirm stationary steering, clearances, ride height and relevant faults", "Controlled road verification only when safe; do not separately bill checks included in selected repair"] });

export const STEERING_OPERATIONS: readonly SteeringOperation[] = operations.map(operation => ({ ...operation, sharedAccess: operation.sharedAccess?.replace(/^front-(left|right)-(suspension|strut)$/, "front-suspension").replace(/^rear-(left|right)-damper$/, "rear-suspension") ?? (["shocks-struts", "springs"].includes(operation.family) && operation.zone.startsWith("front") ? "front-suspension" : null) }));
export const STEERING_COVERAGE_FAMILIES: readonly SteeringFamily[] = ["control-arms", "ball-joints", "bushings", "knuckles", "subframes", "rack-linkage", "hydraulic-assist", "electric-assist", "column", "shocks-struts", "springs", "stabilizers", "rear-links", "air-suspension", "adaptive-damping", "alignment", "diagnosis", "verification"];
export const STEERING_CROSS_REFERENCES = ["Wheel hubs, bearings, tires and balancing: Tires & wheels", "Steering-angle sensor hardware and brake stability faults: Brakes/ABS", "Clock spring, restraints and ADAS calibration: Electrical & safety", "Collision/structural damage and modified geometry require separate capability/scope review"];

export function steeringOperationForId(id: string) {
  const source = id.replace(/:front-(left|right)$/, "");
  return STEERING_OPERATIONS.find(operation => operation.id === source || operation.previewId === source || operation.aliases.includes(source));
}

function zoneFor(id: string, operation: SteeringOperation) {
  return id.match(/:front-(left|right)$/)?.[0].slice(1) ?? operation.zone;
}

function sameLocation(leftZone: string, rightZone: string) {
  return leftZone === "unspecified" || rightZone === "unspecified" || leftZone === rightZone || leftZone.startsWith(`${rightZone}-`) || rightZone.startsWith(`${leftZone}-`);
}

export function steeringScopeConflict(leftId: string, rightId: string) {
  const left = steeringOperationForId(leftId), right = steeringOperationForId(rightId);
  if (!left || !right) return false;
  const sameZone = sameLocation(zoneFor(leftId, left), zoneFor(rightId, right));
  if (left.id === right.id) return sameZone;
  const unitKey = (operation: SteeringOperation) => operation.label.replace(/^Replace (front |rear )?(left |right )?/, "");
  if (sameZone && left.label.startsWith("Replace") && right.label.startsWith("Replace") && unitKey(left) === unitKey(right)) return true;
  if (sameZone && ((left.id === "front-ball-joint" && right.family === "ball-joints") || (right.id === "front-ball-joint" && left.family === "ball-joints"))) return true;
  if (left.contains.includes(right.id) || right.contains.includes(left.id)) return sameZone;
  for (const [packageOp, component] of [[left, right], [right, left]]) {
    if (!sameZone) continue;
    if (packageOp.label.includes("complete lower arm") && (component.family === "ball-joints" || component.family === "bushings" || component.label.includes("lower control arm")) && component.zone.startsWith("front") && !/upper|subframe/.test(component.label)) return true;
    if (packageOp.id === "control-arm" && component.label.includes("lower control arm")) return true;
    if (packageOp.label.includes("complete loaded strut") && /strut assembly|strut mount|strut bearing|coil spring|damper dust boot/.test(component.label)) return true;
    if (packageOp.id === "front-strut-assembly" && /front (left|right) (strut assembly|complete loaded strut)/.test(component.label)) return true;
    if (packageOp.id === "rear-shock-absorbers-both-sides" && /rear (left|right) shock absorber/.test(component.label)) return true;
    if (packageOp.id === "rear-sway-bar-links" && component.label === "Replace rear stabilizer link") return true;
    if (packageOp.family === "hydraulic-assist" && packageOp.label.startsWith("Replace") && component.label === "Bleed power steering hydraulic circuit") return true;
    if (packageOp.family === "electric-assist" && packageOp.label.includes("control module") && packageOp.label.startsWith("Replace") && component.label === "Program electric steering control module") return true;
    if (packageOp.label === "Replace complete electric steering rack with motor and module" && ["Replace steering rack assembly", "Replace electric steering motor", "Replace electric steering control module", "Program electric steering control module", "Perform steering assist calibration"].includes(component.label)) return true;
    if (packageOp.id === "rack-pinion" && component.label === "Bleed power steering hydraulic circuit") return true;
    if (packageOp.family === "verification" && !component.diagnosis) return true;
  }
  const alignmentPackages = ["Perform four-wheel alignment", "Perform front-wheel alignment", "Adjust wheel alignment angles", "Measure wheel alignment without adjustment"];
  return alignmentPackages.includes(left.label) && alignmentPackages.includes(right.label);
}
