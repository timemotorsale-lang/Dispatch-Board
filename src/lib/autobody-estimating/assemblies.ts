import type { Component, Geometry, Method, Zone } from "./catalog";

export type AssemblyItem = { id: string; label: string; geometry: Geometry; children?: AssemblyItem[]; assessment?: boolean };
type Part = [string, string, Geometry, Part[]?, boolean?];
const item = (id: string, label: string, geometry: Geometry, children?: Part[], assessment?: boolean): Part => [id, label, geometry, children, assessment];

const doorParts: Part[] = [
  item("skin", "Outer skin", "panel"),
  item("shell", "Inner shell / intrusion protection", "door", undefined, true),
  item("window", "Glass & window mechanism", "glass", [
    item("glass", "Movable glass", "glass"), item("regulator", "Window regulator", "rail", [
      item("motor", "Window motor", "sensor"), item("cable", "Cable / drive mechanism, if serviceable", "tube"), item("mount", "Regulator mounts / fasteners", "sensor"),
    ]), item("run", "Glass run channel", "seal"), item("belt-in", "Inner belt molding", "seal"), item("belt-out", "Outer belt molding", "seal"),
  ]),
  item("trim", "Interior trim & equipment", "door", [
    item("card", "Trim panel", "panel"), item("clips", "Trim clips / retainers", "sensor"), item("armrest", "Armrest / pull handle", "panel"),
    item("switch", "Window / lock switch", "sensor"), item("speaker", "Speaker / grille", "sensor"), item("barrier", "Moisture barrier / sealing adhesive", "seal"),
  ]),
  item("lock", "Handles, latch & lock", "sensor", [
    item("outside", "Exterior handle / carrier", "seal"), item("inside", "Interior release handle", "seal"),
    item("latch", "Latch / lock assembly", "sensor", [item("actuator", "Lock actuator, if separate", "sensor"), item("cable", "Release cable / linkage", "tube"), item("clip", "Linkage clips / retainers", "sensor")]),
    item("striker", "Striker / mounting hardware", "sensor"), item("key", "Lock cylinder, if fitted", "sensor"),
  ]),
  item("mount", "Hinges, checks & seals", "rail", [item("upper", "Upper hinge / fasteners", "rail"), item("lower", "Lower hinge / fasteners", "rail"), item("check", "Door check / limiter", "rail"), item("seal", "Perimeter weatherstrip", "seal"), item("drain", "Drain openings / plugs", "sensor")]),
  item("wire", "Electrical connections", "tube", [item("harness", "Door harness", "tube"), item("connector", "Connectors / terminals", "sensor"), item("boot", "Harness boot / grommet", "seal"), item("sensor", "Door / safety sensors, if fitted", "sensor", undefined, true)]),
];
const slidingParts: Part[] = [...doorParts.filter(part => part[0] !== "mount"), item("slide", "Sliding mechanism", "rail", [
  item("upper", "Upper track / roller", "rail"), item("center", "Center track / roller", "rail"), item("lower", "Lower track / roller", "rail"),
  item("drive", "Power drive, if fitted", "sensor", [item("motor", "Drive motor", "sensor"), item("cable", "Drive cable", "tube"), item("clutch", "Clutch / drive coupling", "sensor")]),
  item("stop", "Stops / bumpers", "sensor"), item("seal", "Opening weatherstrip", "seal"), item("anti-pinch", "Anti-pinch / obstruction system", "sensor", undefined, true),
])];
const closure: Part[] = [item("outer", "Outer panel", "panel"), item("inner", "Inner shell", "panel"), item("hinges", "Hinges / fasteners", "rail"), item("latch", "Latch / striker", "sensor", [item("actuator", "Release actuator, if fitted", "sensor"), item("cable", "Release cable / linkage", "tube")]), item("seal", "Weatherstrip / seals", "seal"), item("trim", "Inner trim / clips", "panel"), item("support", "Supports / dampers", "rail"), item("wire", "Harness / connectors", "tube")];
const bumper: Part[] = [item("cover", "Outer cover / fascia", "cover"), item("grille", "Grilles / inserts", "panel"), item("lower", "Lower valance / spoiler", "panel"), item("retainer", "Side retainers / guides", "rail"), item("clips", "Clips / screws / push retainers", "sensor"), item("absorber", "Impact absorber", "beam", undefined, true), item("beam", "Reinforcement / crash boxes", "beam", undefined, true), item("equipment", "Attached equipment, if fitted", "sensor", [item("lamp", "Reflector / lamp", "lamp"), item("sensor", "Parking sensor / bracket", "sensor", undefined, true), item("harness", "Harness / connectors", "tube"), item("cover", "Tow-eye / access cover", "panel")])];
const lamp: Part[] = [item("lens", "Lens / housing (serviceability varies)", "lamp"), item("mount", "Mounting tabs / brackets", "rail"), item("module", "Lamp modules / bulbs, if serviceable", "sensor"), item("seal", "Seals / vent caps", "seal"), item("wire", "Connectors / harness", "tube"), item("adjust", "Adjustment / aiming equipment", "sensor")];
const mirror: Part[] = [item("glass", "Mirror glass / heater", "glass"), item("cap", "Outer cap", "panel"), item("base", "Base / gasket / fasteners", "seal"), item("motor", "Adjustment / folding motor, if serviceable", "sensor"), item("lamp", "Turn signal / puddle lamp, if fitted", "lamp"), item("sensor", "Camera / blind-spot equipment, if fitted", "sensor", undefined, true), item("wire", "Harness / connectors", "tube")];
const templates: Record<string, Part[]> = {
  "left-front-door": doorParts, "right-front-door": doorParts, "left-rear-door": doorParts, "right-rear-door": doorParts,
  "left-sliding-door": slidingParts, "right-sliding-door": slidingParts, "left-cargo-door": doorParts, "right-cargo-door": doorParts,
  "front-cover": bumper, "rear-cover": bumper,
  hood: [...closure.filter(part => !["wire", "trim"].includes(part[0])), item("insulator", "Insulator / retaining clips", "panel"), item("washer", "Washer nozzles / hose, if fitted", "tube")],
  decklid: [...closure, item("garnish", "Exterior garnish / emblem", "panel"), item("lamp", "License lamp / wiring", "lamp")],
  liftgate: [...closure, item("glass", "Glass / seal", "glass"), item("wiper", "Wiper / washer", "sensor"), item("drive", "Power lift / anti-pinch equipment, if fitted", "sensor", undefined, true)],
  tailgate: [...closure, item("cable", "Support cables / pivots", "rail"), item("camera", "Rear camera, if fitted", "sensor", undefined, true)],
  "left-headlamp": lamp, "right-headlamp": lamp, "tail-lamp": lamp, "left-mirror": mirror, "right-mirror": mirror,
  "left-fender": [item("outer", "Outer fender", "panel"), item("liner", "Wheelhouse liner", "panel"), item("bracket", "Brackets / fasteners", "rail"), item("molding", "Arch molding / trim, if fitted", "seal"), item("shield", "Splash shield / seals", "seal")],
  "right-fender": [item("outer", "Outer fender", "panel"), item("liner", "Wheelhouse liner", "panel"), item("bracket", "Brackets / fasteners", "rail"), item("molding", "Arch molding / trim, if fitted", "seal"), item("shield", "Splash shield / seals", "seal")],
  "truck-bed": [item("left", "Left bedside", "panel", undefined, true), item("right", "Right bedside", "panel", undefined, true), item("floor", "Bed floor / crossmembers", "rail", undefined, true), item("front", "Front bulkhead", "panel", undefined, true), item("liner", "Bed liner / trim", "panel"), item("tie", "Tie-downs / mounting hardware", "sensor"), item("fuel", "Fuel / charge access area", "sensor", undefined, true)],
  windshield: [item("glass", "Windshield glass", "glass"), item("molding", "Moldings / clips", "seal"), item("bond", "Bonding / primer system", "seal", undefined, true), item("sensor", "Camera / sensor bracket, if fitted", "sensor", undefined, true), item("cowl", "Cowl / access trim", "panel")],
  "back-glass": [item("glass", "Rear glass", "glass"), item("seal", "Seal / bonding system", "seal", undefined, true), item("defrost", "Defroster connections", "tube"), item("trim", "Surrounding trim / clips", "seal")],
  "roof-panel": [item("outer", "Outer roof / joining assessment", "panel", undefined, true), item("molding", "Roof moldings / clips", "seal"), item("antenna", "Antenna / gasket, if fitted", "sensor"), item("rack", "Roof rails / crossbars, if fitted", "rail"), item("opening", "Roof opening / drain system, if fitted", "glass", undefined, true)],
  "bus-entry": [item("leaf", "Entry door leaf / glazing", "door"), item("drive", "Opening mechanism", "rail", undefined, true), item("seal", "Edge seals", "seal"), item("safety", "Entry interlock / obstruction system", "sensor", undefined, true)],
  "bus-side": [item("skin", "Side skin / panel", "panel", undefined, true), item("window", "Passenger glazing / seals", "glass"), item("trim", "Exterior trim / retainers", "seal"), item("exit", "Emergency-exit equipment, if fitted", "sensor", undefined, true)],
  "cargo-box": [item("wall", "Box side / roof panels", "panel", undefined, true), item("closure", "Rear cargo closure", "door"), item("seal", "Seals / perimeter trim", "seal"), item("step", "Step / access equipment", "rail", undefined, true)],
  grille: [item("outer", "Grille / surround", "panel"), item("insert", "Insert / mesh", "panel"), item("guide", "Air guides / seals", "seal"), item("clips", "Retaining clips / screws", "sensor"), item("shutter", "Active shutter equipment, if fitted", "sensor", undefined, true)],
  "door-regulator": doorParts.find(part => part[0] === "window")![3]!,
  "door-trim": doorParts.find(part => part[0] === "trim")![3]!,
  "door-hinges": doorParts.find(part => part[0] === "mount")![3]!,
  "door-glass": [item("glass", "Movable glass", "glass"), item("run", "Glass run channel", "seal"), item("guide", "Guides / retaining hardware", "rail"), item("belt", "Belt seals / moldings", "seal")],
  "quarter-glass": [item("glass", "Fixed glass", "glass"), item("seal", "Perimeter seal / bonding", "seal", undefined, true), item("trim", "Surround / fasteners", "seal")],
  "front-absorber": [item("absorber", "Energy absorber / condition assessment", "beam", undefined, true), item("mount", "Locating features / attachments", "rail", undefined, true)],
  "rear-absorber": [item("absorber", "Energy absorber / condition assessment", "beam", undefined, true), item("mount", "Locating features / attachments", "rail", undefined, true)],
  "front-reinforcement": [item("member", "Reinforcement member", "beam", undefined, true), item("crashbox", "Crash boxes / mounts", "rail", undefined, true), item("hardware", "Attachment hardware", "sensor", undefined, true)],
  "rear-reinforcement": [item("member", "Reinforcement member", "beam", undefined, true), item("crashbox", "Crash boxes / mounts", "rail", undefined, true), item("hardware", "Attachment hardware", "sensor", undefined, true)],
  "bumper-brackets": [item("guide", "Side guides / retainers", "rail"), item("support", "Local support brackets", "rail"), item("hardware", "Fasteners / clips", "sensor")],
  "left-liner": [item("shield", "Liner / splash shield", "panel"), item("clips", "Clips / screws", "sensor"), item("seal", "Edge seals / air guides", "seal")],
  "right-liner": [item("shield", "Liner / splash shield", "panel"), item("clips", "Clips / screws", "sensor"), item("seal", "Edge seals / air guides", "seal")],
  "left-quarter": [item("outer", "Outer quarter / joining assessment", "panel", undefined, true), item("inner", "Inner wheelhouse / adjoining structure", "rail", undefined, true), item("trim", "Wheel-arch trim / liner", "panel"), item("fuel", "Filler / access equipment", "sensor", undefined, true), item("seal", "Sealers / corrosion protection", "seal", undefined, true)],
  "right-quarter": [item("outer", "Outer quarter / joining assessment", "panel", undefined, true), item("inner", "Inner wheelhouse / adjoining structure", "rail", undefined, true), item("trim", "Wheel-arch trim / liner", "panel"), item("fuel", "Filler / access equipment", "sensor", undefined, true), item("seal", "Sealers / corrosion protection", "seal", undefined, true)],
  "left-rocker": [item("outer", "Outer rocker / joining assessment", "rail", undefined, true), item("reinforcement", "Inner reinforcement / structure", "rail", undefined, true), item("trim", "Sill molding / clips", "seal"), item("seal", "Sealers / drain / corrosion review", "seal", undefined, true)],
  "right-rocker": [item("outer", "Outer rocker / joining assessment", "rail", undefined, true), item("reinforcement", "Inner reinforcement / structure", "rail", undefined, true), item("trim", "Sill molding / clips", "seal"), item("seal", "Sealers / drain / corrosion review", "seal", undefined, true)],
  "rear-panel": [item("outer", "Rear body panel / joining assessment", "panel", undefined, true), item("support", "Adjoining supports / structure", "rail", undefined, true), item("trim", "Access trim / fasteners", "panel"), item("seal", "Sealers / corrosion protection", "seal", undefined, true)],
  "cargo-door": closure,
  "door-skin": [item("outer", "Outer skin / serviceability review", "panel", undefined, true), item("hem", "Hem / joining method review", "rail", undefined, true), item("adhesive", "Adhesive / corrosion protection review", "seal", undefined, true)],
};
const extraRoots: Component[] = [
  ...["left", "right"].flatMap(side => [
    { id: `${side}-sliding-door`, label: `${side === "left" ? "Left" : "Right"} sliding door`, familyId: "closures", zone: side as Zone, geometry: "door" as Geometry },
    { id: `${side}-cargo-door`, label: `${side === "left" ? "Left" : "Right"} rear cargo door`, familyId: "closures", zone: "rear" as Zone, geometry: "door" as Geometry },
  ]),
  { id: "bus-entry", label: "Bus entry door", familyId: "closures", zone: "right" as Zone, geometry: "door" as Geometry },
  { id: "bus-side", label: "Bus passenger-side section", familyId: "side-roof", zone: "right" as Zone, geometry: "panel" as Geometry },
  { id: "cargo-box", label: "Commercial cargo box", familyId: "rear-body", zone: "rear" as Zone, geometry: "panel" as Geometry },
].map(root => ({ ...root, methods: ["INSPECT", "SUBLET"], category: "BODY", aliases: "", related: [], caution: "Confirm construction and the applicable procedure for this vehicle before planning repair." }));

export function expandAssemblyCatalog(base: Component[]) {
  const roots = [...base, ...extraRoots], additions: Component[] = [...extraRoots];
  const trees: Record<string, AssemblyItem> = {};
  const parents: Record<string, string> = {};
  for (const root of roots) {
    const template = templates[root.id];
    if (!template) continue;
    const prefix = root.id.replace("left-front-door", "lfd").replace("right-front-door", "rfd").replace("left-rear-door", "lrd").replace("right-rear-door", "rrd").replace("left-sliding-door", "lsd").replace("right-sliding-door", "rsd").replace("left-cargo-door", "lcd").replace("right-cargo-door", "rcd");
    function build(parts: Part[], parent: string, trail: string[]): AssemblyItem[] {
      return parts.map(([key, label, geometry, children, assessment]) => {
        const id = `p-${prefix}-${[...trail, key].join("-")}`;
        parents[id] = parent;
        const methods: Method[] = assessment ? ["INSPECT", "SUBLET"] : geometry === "panel" || key === "skin" ? ["INSPECT", "REPAIR", "REPLACE", "REMOVE_INSTALL", "REFINISH", "BLEND"] : ["INSPECT", "REPLACE", "REMOVE_INSTALL"];
        additions.push({ id, label: `${root.label} / ${label}`, familyId: root.familyId, zone: root.zone, geometry, methods, category: root.category, aliases: `${root.label} ${label}`, related: [parent], ...(assessment ? { caution: "Applicable technical procedure and qualified assessment required. Serviceability varies by vehicle." } : {}) });
        return { id, label, geometry, assessment, ...(children ? { children: build(children, id, [...trail, key]) } : {}) };
      });
    }
    trees[root.id] = { id: root.id, label: root.label, geometry: root.geometry, children: build(template, root.id, []) };
  }
  return { additions, trees, parents };
}
