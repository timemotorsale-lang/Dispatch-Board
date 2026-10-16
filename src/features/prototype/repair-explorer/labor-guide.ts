import type { RepairOperation } from "./catalog";

export type LaborPlan = {
  version: "planning-v1";
  basis: "DEMO_SEED" | "WORK_BREAKDOWN";
  hours: number;
  low: number;
  high: number;
  confidence: "UNVALIDATED";
  scope: string;
  stages: { label: string; hours: number }[];
};

const GROUP_HOURS: Record<string, number> = {
  "steering-rear": 2, "steering-alignment": 1.2, "steering-diagnosis": 1,
  "brakes-electronic": 2, "brakes-controls": 1, "brakes-diagnosis": 1,
  "maintenance-sample": 0.5, "maintenance-fluids": 1, "maintenance-inspections": 1, "maintenance-belts": 1,
  "engine-assembly": 18, "engine-head": 10, "engine-bottom": 20, "engine-timing": 8, "engine-lubrication": 3,
  "engine-cooling": 2, "engine-air": 1.5, "engine-fuel": 2.5, "engine-sample": 1.5, "engine-boost": 5,
  "engine-diesel": 3, "engine-controls": 1.5, "engine-ventilation": 1,
  "transmission-sample": 7, "transmission-cvt": 8, "transmission-manual": 6, "transmission-transfer": 4,
  "transmission-differential": 5, "transmission-shafts": 2, "transmission-controls": 1.5, "transmission-commercial": 3,
  friction: 1.5, "brakes-drum": 2, abs: 1.5, hydraulics: 2, parking: 1.5, "brakes-air": 2, "brakes-trailer": 1.5,
  "steering-sample": 2, "steering-rack": 2.5, "steering-assist": 2, "steering-struts": 2,
  "steering-stabilizer": 1, "steering-air": 2, "steering-column": 2.5,
  "tires-sample": 1, "tires-hubs": 2, "tires-tpms": 0.5, "tires-rims": 0.5, "tires-commercial": 1.5,
  "electrical-sample": 1.5, "electrical-distribution": 1.5, "electrical-network": 1.5, "electrical-lighting": 0.8,
  "electrical-security": 1, "electrical-instruments": 1, "electrical-trailer": 1,
  "hvac-sample": 1, "hvac-refrigerant": 2.5, "hvac-heat": 2, "hvac-controls": 1.5, "hvac-drains": 1.5,
  "exhaust-sample": 1, "exhaust-hardware": 2, "exhaust-catalyst": 2.5, "exhaust-evap": 1.5, "exhaust-egr": 2.5, "exhaust-diesel": 2.5,
  "safety-sample": 1.5, "safety-srs": 2, "safety-belts": 1.5, "safety-braking": 1.5,
  "body-sample": 1.5, "body-glass": 2, "body-wipers": 1, "body-seats": 2, "body-roof": 3,
  "body-closures": 1.5, "body-infotainment": 1.5, "body-trim": 1.5, "body-commercial": 2,
  "ev-battery": 5, "ev-drive": 5, "ev-charge-hardware": 3, "ev-sample": 2.5, "ev-hybrid": 5, "ev-service": 1
};

const OPERATION_HOURS: Record<string, number> = {
  "Replace engine assembly": 18, "Replace engine long block": 22, "Replace engine short block": 28,
  "Remove and reinstall engine assembly": 16, "Overhaul engine assembly": 36,
  "Replace engine mount": 2, "Replace engine torque strut": 1, "Replace engine support bracket": 2,
  "Service engine subframe mounting": 3, "Replace cylinder head assembly": 12, "Replace cylinder head gasket": 12,
  "Service cylinder head valves and seats": 16, "Replace camshaft": 8, "Replace rocker arm or follower": 4,
  "Replace valve lifter": 8, "Replace valve spring": 5, "Replace valve stem seals": 8,
  "Replace valve cover gasket": 2, "Replace camshaft carrier seal": 5, "Replace rear main seal": 8,
  "Replace front crankshaft seal": 2.5, "Replace core plug": 3, "Replace harmonic balancer": 2,
  "Replace timing chain set": 9, "Replace timing belt set": 5, "Replace camshaft phaser": 8,
  "Replace variable valve timing solenoid": 1, "Replace oil pressure sensor": 1,
  "Replace oil dipstick tube": 0.7, "Replace oil filter adapter gasket": 2, "Replace oil pump": 5,
  "Replace radiator cooling fan": 1.5, "Replace cooling fan control module": 1,
  "Replace coolant expansion tank": 0.8, "Replace coolant temperature sensor": 0.8,
  "Replace mass airflow sensor": 0.5, "Replace manifold pressure sensor": 0.5,
  "Replace intake air duct": 0.5, "Replace air cleaner housing": 0.8,
  "Replace fuel tank": 3, "Replace in-tank fuel pump": 3, "Replace fuel injector": 2,
  "Replace crankshaft position sensor": 1.5, "Replace camshaft position sensor": 1,
  "Replace ignition coil": 0.8, "Replace ignition wires": 1,
  "Replace turbocharger assembly": 6, "Replace supercharger assembly": 5,
  "Replace boost pressure sensor": 0.7, "Replace turbo wastegate actuator": 2,
  "Replace charge-air hose": 0.8, "Replace bypass or diverter valve": 1,
  "Replace glow plug control module": 1, "Replace diesel glow plug": 1.5,
  "Replace PCV valve": 0.5, "Replace crankcase vent hose": 0.7,
  "Replace automatic transmission assembly": 8, "Overhaul automatic transmission": 16,
  "Replace transmission valve body": 4, "Replace shift solenoid": 3,
  "Replace transmission filter and pan gasket": 1.5, "Replace transmission cooler line": 1.5,
  "Replace transmission mount": 1, "Replace torque converter": 8,
  "Replace CVT assembly": 8, "Replace CVT valve body": 4, "Service CVT fluid": 1.5,
  "Replace dual-clutch transmission assembly": 8, "Replace dual-clutch pack": 8,
  "Replace manual transmission assembly": 7, "Overhaul manual gearbox": 14,
  "Replace clutch kit": 7, "Replace flywheel": 7, "Replace clutch master cylinder": 1.5,
  "Replace clutch slave cylinder": 3, "Replace clutch hydraulic line": 1,
  "Replace shift cable": 1.5, "Replace transfer-case shift motor": 1.5,
  "Replace transfer-case output seal": 2, "Replace locking hub": 1.5,
  "Overhaul differential": 9, "Replace ring and pinion set": 8,
  "Replace pinion seal": 2, "Replace axle shaft seal": 2,
  "Replace driveshaft center support bearing": 2.5, "Replace propeller shaft": 1.5,
  "Replace ABS hydraulic control unit": 3, "Perform ABS service bleed": 0.8,
  "Replace brake booster": 3, "Replace hydroboost unit": 3,
  "Replace brake fluid reservoir": 0.8, "Replace brake flexible hose": 1,
  "Replace brake vacuum pump": 1.5,
  "Replace electronic parking brake switch": 0.5, "Replace parking brake switch": 0.5,
  "Replace steering rack assembly": 4.5, "Replace steering gearbox": 4,
  "Replace steering rack boot": 1, "Replace inner tie rod": 1.5, "Replace outer tie rod end": 1,
  "Replace power steering reservoir": 0.8, "Replace electric steering control module": 1.5,
  "Replace suspension subframe": 6, "Replace strut mount": 2.5,
  "Replace air suspension compressor": 2, "Replace ride height sensor": 0.8,
  "Replace steering wheel": 1, "Replace steering column lock": 2,
  "Mount and balance tire": 0.5, "Repair repairable tire puncture": 0.5,
  "Rotate tires": 0.5, "Replace tire valve stem": 0.5,
  "Replace press-fit wheel bearing": 2.5, "Replace wheel stud": 1,
  "Replace tire pressure sensor": 0.5, "Service TPMS valve seal": 0.5,
  "Replace wheel rim": 0.5, "Replace wheel lug nut": 0.2,
  "Inspect wheel runout": 0.5, "Clean wheel mounting surface": 0.3, "Replace wheel center cap": 0.2,
  "Replace starter motor": 1.5, "Replace alternator": 1.8, "Replace starter relay": 0.3,
  "Replace battery current sensor": 0.5, "Register replacement battery": 0.4,
  "Replace electrical relay": 0.3, "Replace fusible link": 0.7, "Repair ground strap": 0.7,
  "Replace headlamp bulb": 0.5, "Replace interior lamp": 0.3, "Aim headlamps": 0.5,
  "Replace key fob battery": 0.2, "Replace accessory power socket": 0.7,
  "Replace USB charging module": 0.7, "Replace horn relay": 0.3,
  "Replace blower motor resistor": 0.8, "Replace blower control module": 0.8,
  "Replace A/C evaporator": 8, "Replace heater core": 7, "Replace rear heater core": 4,
  "Replace expansion valve": 2, "Replace orifice tube": 1.5, "Recover, evacuate and recharge A/C": 1.2,
  "Replace refrigerant pressure sensor": 0.8, "Replace cabin temperature sensor": 0.8,
  "Replace ambient temperature sensor": 0.7, "Replace sunload sensor": 0.7,
  "Clear evaporator drain": 0.5, "Service HVAC odor concern": 0.7,
  "Replace exhaust temperature sensor": 1, "Replace exhaust pressure sensor": 1,
  "Replace exhaust manifold": 4, "Repair broken exhaust manifold fastener": 3,
  "Replace exhaust hanger": 0.5, "Replace exhaust heat shield": 0.7,
  "Replace fuel cap": 0.2, "Replace EVAP purge valve": 0.8,
  "Replace EVAP vent valve": 1, "Replace charcoal canister": 1.5,
  "Replace EGR cooler": 5, "Replace diesel particulate filter": 4,
  "Service DPF cleaning": 3, "Perform commanded DPF regeneration": 1,
  "Replace NOx sensor": 1, "Replace DPF differential pressure sensor": 0.8,
  "Replace steering wheel clock spring": 1.5, "Replace driver airbag module": 1,
  "Replace curtain airbag module": 3, "Replace seat belt retractor": 1.5,
  "Replace occupant classification sensor": 2.5, "Replace window switch": 0.5,
  "Replace door hinge": 2, "Replace door weatherstrip": 0.8,
  "Replace mirror glass": 0.5, "Replace windshield": 3,
  "Replace wiper blade": 0.2, "Replace wiper arm": 0.5,
  "Replace washer nozzle": 0.5, "Repair washer hose": 0.7,
  "Replace sunroof glass": 2, "Service sunroof drain": 0.8,
  "Replace convertible top hydraulic cylinder": 4, "Replace hood support strut": 0.3,
  "Replace GPS antenna": 1, "Replace speaker": 1, "Replace carpet": 5,
  "Replace headliner": 4, "Replace engine splash shield": 0.5,
  "Replace high-voltage battery assembly": 7, "Replace high-voltage contactor assembly": 5,
  "Replace front electric drive unit": 6, "Replace rear electric drive unit": 6,
  "Replace traction motor": 6, "Replace drive inverter": 4,
  "Service electric drive-unit fluid": 1, "Replace charge port door actuator": 1,
  "Replace onboard charger": 4, "Replace DC-to-DC converter": 3,
  "Replace hybrid transaxle": 8, "Replace hybrid battery cooling fan": 1.5,
  "Replace hybrid battery air duct": 1
};

const round = (hours: number) => Math.max(0.1, Math.round(hours * 10) / 10);

export function buildLaborPlan(operation: RepairOperation, groupId: string): LaborPlan {
  const base = GROUP_HOURS[groupId];
  if (base === undefined) throw new Error(`Missing labor planning profile: ${groupId}`);
  const originalHours = operation.hours;
  let hours = originalHours ?? OPERATION_HOURS[operation.label] ?? base;
  if (originalHours === null && OPERATION_HOURS[operation.label] === undefined) {
    if (operation.kind === "diagnosis") hours = /compression|leak-down|isolation|intermittent|network|internal/.test(operation.label.toLowerCase()) ? 1.5 : 1;
    else if (/^(Calibrate|Program|Perform .*calibration|Perform .*programming|Perform .*relearn|Perform .*adaptation|Perform .*configuration)/.test(operation.label)) hours = 1.5;
    else if (/^(Service .*fluid|Exchange|Flush|Reset|Adjust|Clean)/.test(operation.label)) hours = Math.min(base, 1.2);
    else if (/^(Inspect|Test|Verify)/.test(operation.label)) hours = 0.8;
  }
  hours = round(hours);
  const ratios = operation.kind === "diagnosis" ? [0.1, 0.6, 0.1] : [0.3, 0.4, 0.2];
  const minutes = Math.round(hours * 60);
  const stages = ratios.map((ratio) => Math.floor(minutes * ratio));
  stages.push(minutes - stages.reduce((total, value) => total + value, 0));
  return {
    version: "planning-v1", basis: originalHours === null ? "WORK_BREAKDOWN" : "DEMO_SEED", hours,
    low: round(hours * (operation.kind === "diagnosis" ? 0.5 : 0.65)),
    high: round(hours * (operation.kind === "diagnosis" ? 2 : 1.6)),
    confidence: "UNVALIDATED",
    scope: operation.kind === "diagnosis" ? "Initial diagnostic assessment; deeper diagnosis requires a revised scope." : "One listed operation; position and quantity follow the work description.",
    stages: ["Setup and access", operation.kind === "diagnosis" ? "Testing and analysis" : "Perform operation", "Reassembly and cleanup", "Verification and documentation"].map((label, index) => ({ label, hours: stages[index] / 60 }))
  };
}

export const LABOR_REFERENCE_EXAMPLES = [
  {
    id: "ford-20-2315", label: "Ford TSB 20-2315 · VCT repair package", url: "https://static.nhtsa.gov/odi/tsbs/2020/MC-10180531-0001.pdf",
    groupId: "engine-timing", hours: "9.7 warranty hours · operation 202315A",
    scope: "Historical example: four VCT units plus PCM update on specified 2017–2020 F-150 3.5L EcoBoost vehicles, built by 2019-10-31. Raptor has a separate allowance. The bulletin restricts combining operations. This is not the time for replacing one phaser; verify current applicability."
  },
  {
    id: "ford-20-2034", label: "Ford TSB 20-2034 · heater-core repair package", url: "https://static.nhtsa.gov/odi/tsbs/2020/MC-10171861-0001.pdf",
    groupId: "hvac-heat", hours: "7.7–8.5 warranty hours · 3.5L EcoBoost configurations",
    scope: "Historical example: temperature checks, cooling-system flush and heater-core work for eligible F-150s with a block heater, built by 2019-01-01. Seating and console layout change the allowance. It is not a generic heater-core replacement time; verify the bulletin conditions."
  }
];
