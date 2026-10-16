import { EXPANDED_REPAIR_SYSTEMS } from "./expanded-catalog";
import { buildLaborPlan, type LaborPlan } from "./labor-guide";

export type RepairOperation = {
  id: string;
  label: string;
  kind: "repair" | "diagnosis";
  hours: number | null;
  parts: number | null;
  keywords: string;
  includes: string[];
  conflictGroup?: string;
  laborPlan?: LaborPlan;
};

export type RepairGroup = { id: string; label: string; operations: RepairOperation[] };
export type RepairSystem = { id: string; label: string; groups: RepairGroup[] };

function operation(id: string, label: string, hours: number, parts: number, keywords: string, kind: RepairOperation["kind"] = "repair", conflictGroup?: string): RepairOperation {
  return {
    id, label, hours, parts, keywords, kind, conflictGroup,
    includes: kind === "diagnosis"
      ? ["Confirm and document the concern", "Perform the selected diagnostic checks", "Record findings before recommending repairs"]
      : ["Remove and install the selected component", "Inspect related connections and hardware", "Verify operation after repair"]
  };
}

function sampleSystem(id: string, label: string, group: string, repair: RepairOperation, diagnosis: RepairOperation): RepairSystem {
  return { id, label, groups: [{ id: `${id}-sample`, label: group, operations: [repair, diagnosis] }] };
}

const ORIGINAL_REPAIR_SYSTEMS: RepairSystem[] = [
  sampleSystem("maintenance", "Maintenance", "Oil & filters",
    operation("oil-service", "Change engine oil & filter", 0.5, 65, "scheduled service oil filter lubrication"),
    operation("maintenance-inspection", "Inspect maintenance needs", 0.5, 0, "inspection mileage interval scheduled", "diagnosis")),
  sampleSystem("engine", "Engine", "Ignition & running concerns",
    operation("spark-plugs", "Replace spark plugs", 2, 120, "ignition misfire tune up"),
    operation("engine-misfire", "Diagnose engine misfire", 1, 0, "rough idle shaking P0300 P0301 check engine", "diagnosis")),
  sampleSystem("transmission", "Transmission & driveline", "Transmission & fluid",
    operation("transmission-service", "Service transmission fluid", 1.5, 130, "automatic fluid filter service"),
    operation("transmission-shift", "Diagnose shifting concern", 1, 0, "slipping harsh shift P0700 driveline", "diagnosis")),
  { id: "brakes", label: "Brakes", groups: [
    { id: "friction", label: "Pads, rotors & calipers", operations: [
      ...["Front", "Rear"].flatMap((axle) => {
        const prefix = axle.toLowerCase();
        return [
          { ...operation(`${prefix}-pads-rotors`, `Replace ${prefix} pads & rotors`, 2, 220, `${prefix} brake grinding vibration squeal discs`, "repair", `${prefix}-friction`), includes: ["Replace pads and rotors on both sides", "Inspect caliper slides and hardware", "Check brake operation after repair"] },
          operation(`${prefix}-pads`, `Replace ${prefix} brake pads`, 1.2, 90, `${prefix} brake pads squeal worn`, "repair", `${prefix}-friction`),
          ...["left", "right"].map((side) => operation(`${prefix}-${side}-caliper`, `Replace ${prefix} ${side} brake caliper`, 1.3, 160, `${prefix} ${side} brake dragging seized pull hydraulic caliper`))
        ];
      }),
      operation("brake-noise", "Diagnose brake noise or vibration", 0.8, 0, "grinding squealing squeak pulsation shaking stopping", "diagnosis"),
      operation("brake-drag", "Diagnose brake drag or pulling", 1, 0, "hot wheel stuck caliper pulling uneven wear", "diagnosis")
    ] },
    { id: "abs", label: "ABS & stability", operations: [
      operation("wheel-speed-sensor", "Replace wheel speed sensor", 1, 85, "ABS traction stability wheel sensor"),
      operation("abs-warning", "Diagnose ABS warning light", 1, 0, "ABS traction stability C0035 C0040 sensor wiring", "diagnosis")
    ] },
    { id: "hydraulics", label: "Hydraulics", operations: [
      operation("brake-fluid", "Exchange brake fluid & bleed system", 1, 25, "hydraulic fluid bleed flush moisture"),
      operation("soft-pedal", "Diagnose soft pedal or fluid loss", 1, 0, "spongy pedal leak master cylinder hose line", "diagnosis")
    ] },
    { id: "parking", label: "Parking brake", operations: [
      operation("parking-actuator", "Replace parking brake actuator", 1.5, 180, "electronic parking brake EPB motor"),
      operation("parking-diagnosis", "Diagnose parking brake concern", 1, 0, "parking brake will not release hold cable EPB", "diagnosis")
    ] }
  ] },
  sampleSystem("steering", "Steering & suspension", "Control arms & joints",
    operation("control-arm", "Replace lower control arm", 1.5, 180, "ball joint bushing suspension"),
    operation("suspension-noise", "Diagnose suspension noise", 1, 0, "clunk rattle bump steering vibration", "diagnosis")),
  sampleSystem("tires", "Tires & wheels", "Tires & alignment",
    operation("wheel-alignment", "Perform four-wheel alignment", 1, 0, "tire wear tracking alignment"),
    operation("tire-vibration", "Diagnose tire or wheel vibration", 0.8, 0, "balance shaking highway wheel tire TPMS", "diagnosis")),
  sampleSystem("electrical", "Electrical & starting", "Battery & charging",
    operation("battery", "Replace battery", 0.5, 160, "battery starting charging"),
    operation("no-start", "Diagnose no-start concern", 1, 0, "dead battery crank no crank starter alternator", "diagnosis")),
  sampleSystem("hvac", "Heating & A/C", "Cooling & airflow",
    operation("blower", "Replace blower motor", 1.2, 140, "fan air conditioning heater airflow"),
    operation("ac-performance", "Diagnose A/C performance", 1, 0, "warm air not cold refrigerant compressor cooling", "diagnosis")),
  sampleSystem("exhaust", "Exhaust & emissions", "Sensors & emissions",
    operation("oxygen-sensor", "Replace oxygen sensor", 1, 95, "O2 emissions fuel exhaust"),
    operation("emissions-light", "Diagnose emissions warning", 1, 0, "check engine P0420 P0171 catalyst exhaust leak", "diagnosis")),
  sampleSystem("safety", "ADAS & safety", "Cameras & driver assistance",
    operation("camera-calibration", "Calibrate forward camera", 2, 0, "ADAS lane camera windshield calibration"),
    operation("adas-warning", "Diagnose driver assistance warning", 1, 0, "ADAS radar lane camera collision warning", "diagnosis")),
  sampleSystem("body", "Body & interior", "Doors & windows",
    operation("window-regulator", "Replace window regulator", 1.5, 150, "door window glass motor"),
    operation("window-diagnosis", "Diagnose inoperative window", 0.8, 0, "door switch window stuck wiring", "diagnosis")),
  sampleSystem("ev", "Hybrid & EV", "Charging & thermal management",
    operation("ev-coolant", "Service battery cooling circuit", 1.5, 80, "hybrid EV battery thermal coolant"),
    operation("ev-charge", "Diagnose charging concern", 1.5, 0, "hybrid EV charge port high voltage battery", "diagnosis"))
];

export const REPAIR_SYSTEMS: RepairSystem[] = EXPANDED_REPAIR_SYSTEMS.map((system) => {
  const original = ORIGINAL_REPAIR_SYSTEMS.find((item) => item.id === system.id);
  return {
    ...system,
    groups: system.groups.map((group) => {
      const originals = original?.groups.find((item) => item.id === group.id)?.operations ?? [];
      const labels = new Set(originals.map((item) => item.label.toLowerCase()));
      return {
        ...group,
        operations: [...originals, ...group.operations.filter((item) => !labels.has(item.label.toLowerCase()))].map((operation) => {
          const laborPlan = buildLaborPlan(operation, group.id);
          return { ...operation, hours: laborPlan.hours, laborPlan };
        })
      };
    })
  };
});

export const CATALOG_ENTRIES = REPAIR_SYSTEMS.flatMap((system) => system.groups.flatMap((group) => group.operations.map((repair) => ({ system, group, repair }))));

export const CATALOG_COUNTS = { systems: REPAIR_SYSTEMS.length, groups: REPAIR_SYSTEMS.reduce((total, system) => total + system.groups.length, 0), operations: CATALOG_ENTRIES.length };

export function searchRepairs(query: string) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return CATALOG_ENTRIES.filter(({ system, repair }) => {
    const terms = `${system.label} ${repair.label} ${repair.keywords}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    return words.every((word) => terms.some((term) => term.startsWith(word)));
  });
}
