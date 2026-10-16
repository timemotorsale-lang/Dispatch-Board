import { CATALOG_ENTRIES, type RepairOperation } from "./catalog";
import { EXPANDED_VISUAL_AREAS } from "./expanded-visual-catalog";

export type VisualAreaId = "brakes" | "front-suspension" | "maintenance" | "engine" | "transmission" | "tires" | "electrical" | "hvac" | "exhaust" | "safety" | "body" | "ev";
export type VehicleSide = "left" | "right";
export type VisualPart = {
  id: string;
  label: string;
  description: string;
  sideRequired: boolean;
  scope: string;
  callout: [number, number];
  target: [number, number];
  zoom: string;
  operations: string[];
  drawing?: { path: string; strokeOnly?: boolean; width?: number }[];
};

export type VisualArea = { id: VisualAreaId; systemId: string; label: string; subtitle: string; location: string; summary: string; zone: "engine-bay" | "front-wheel" | "cabin" | "underbody"; backdrop?: string[]; parts: VisualPart[] };

export const VISUAL_AREAS: VisualArea[] = [
  { id: "brakes", systemId: "brakes", label: "Front brakes", subtitle: "Generic disc-brake assembly · wheel removed", location: "Front wheel area", summary: "Disc, pads, caliper and fluid hose", zone: "front-wheel", parts: [
    { id: "rotor", label: "Brake disc / rotor", description: "The large round metal disc behind the wheel.", sideRequired: false, scope: "The current catalog replaces front pads and rotors together, across both sides of the axle.", callout: [110, 305], target: [276, 263], zoom: "160 80 280 300", operations: ["Replace front pads & rotors", "Diagnose brake noise or vibration"] },
    { id: "pads", label: "Brake pads", description: "The two friction blocks that squeeze the disc.", sideRequired: false, scope: "Front pad service is for both sides of the axle. The drawing separates the pads to make them easier to identify.", callout: [506, 338], target: [387, 265], zoom: "305 130 240 255", operations: ["Replace front brake pads", "Replace front pads & rotors", "Diagnose brake noise or vibration"] },
    { id: "caliper", label: "Brake caliper", description: "The clamp-shaped housing around the pads and disc.", sideRequired: true, scope: "Choose the vehicle side. Bleeding and any shared work still need scope review.", callout: [516, 210], target: [423, 214], zoom: "315 90 255 285", operations: ["Replace front left brake caliper", "Replace front right brake caliper", "Diagnose brake drag or pulling"] },
    { id: "hose", label: "Flexible brake hose", description: "The flexible fluid line that feeds the caliper.", sideRequired: true, scope: "One front wheel hose. Confirm the exact fitting and vehicle-specific routing.", callout: [490, 55], target: [423, 90], zoom: "320 20 245 250", operations: ["Replace brake flexible hose", "Diagnose brake hydraulic leak", "Diagnose soft pedal or fluid loss"] },
    { id: "abs-sensor", label: "Wheel speed / ABS sensor", description: "The small wired sensor beside the wheel hub.", sideRequired: true, scope: "One front wheel sensor. The sensor may be integral to the hub on some vehicles.", callout: [110, 80], target: [233, 153], zoom: "140 65 270 260", operations: ["Replace wheel speed sensor", "Diagnose wheel speed signal", "Diagnose ABS warning light"] },
    { id: "brake-hub", label: "Wheel hub & bearing", description: "The center mounting flange with wheel studs.", sideRequired: true, scope: "One front wheel hub. Some vehicles use separate bearings rather than a complete hub assembly.", callout: [105, 200], target: [291, 208], zoom: "195 105 245 245", operations: ["Replace front left wheel hub", "Replace front right wheel hub", "Diagnose wheel bearing noise", "Inspect wheel bearing play"] }
  ] },
  { id: "front-suspension", systemId: "steering", label: "Front suspension", subtitle: "Generic MacPherson-strut layout · wheel removed", location: "Front wheel area", summary: "Spring, damper, arms and steering links", zone: "front-wheel", parts: [
    { id: "strut", label: "Strut / damper assembly", description: "The tall shock-absorber assembly above the wheel carrier.", sideRequired: true, scope: "One front strut assembly. Vehicle-specific suspension layouts can differ from this generic strut diagram.", callout: [463, 78], target: [311, 178], zoom: "210 30 290 285", operations: ["Replace front left strut assembly", "Replace front right strut assembly", "Diagnose excessive bounce", "Diagnose suspension noise"] },
    { id: "spring", label: "Coil spring", description: "The spiral-shaped spring around the upper damper.", sideRequired: true, scope: "One spring where separately serviceable. A complete assembly can include this part; avoid overlapping labor.", callout: [106, 94], target: [276, 124], zoom: "190 25 245 235", operations: ["Replace coil spring", "Diagnose suspension sag", "Diagnose excessive bounce"] },
    { id: "mount", label: "Upper strut mount", description: "The attachment at the very top of the strut.", sideRequired: true, scope: "One front mount. Some replacement strut assemblies already include the mount.", callout: [465, 28], target: [297, 49], zoom: "190 0 305 190", operations: ["Replace strut mount", "Diagnose strut mount noise"] },
    { id: "control-arm", label: "Lower control arm", description: "The broad lower arm connecting the chassis to the wheel carrier.", sideRequired: true, scope: "One front lower arm. Bushings or a ball joint may be included in the replacement assembly.", callout: [95, 370], target: [235, 332], zoom: "70 240 360 160", operations: ["Replace lower control arm", "Replace control arm bushing", "Inspect suspension joint play", "Diagnose suspension noise"] },
    { id: "ball-joint", label: "Lower ball joint", description: "The round pivot at the outer end of the lower arm.", sideRequired: true, scope: "One front lower joint, only where separately serviceable. Confirm whether a complete arm is required.", callout: [456, 373], target: [350, 316], zoom: "240 215 280 185", operations: ["Replace left lower ball joint", "Replace right lower ball joint", "Inspect suspension joint play"] },
    { id: "knuckle", label: "Steering knuckle / wheel carrier", description: "The upright casting that holds the hub and connects the suspension joints.", sideRequired: true, scope: "One front carrier. This schematic does not show vehicle-specific fasteners or disassembly steps.", callout: [530, 218], target: [360, 255], zoom: "260 160 300 220", operations: ["Replace steering knuckle", "Inspect suspension joint play", "Diagnose abnormal suspension geometry"] },
    { id: "tie-rod", label: "Outer tie rod end", description: "The steering link entering the wheel carrier from the side.", sideRequired: true, scope: "One front outer tie rod end. Alignment is separate unless already included in the selected work.", callout: [77, 254], target: [290, 275], zoom: "50 185 360 175", operations: ["Replace outer tie rod end", "Diagnose steering free play", "Diagnose steering pull"] },
    { id: "stabilizer-link", label: "Stabilizer / sway-bar link", description: "The slim link joining the anti-roll bar to the suspension.", sideRequired: true, scope: "One front link. Mounting locations vary by suspension design.", callout: [91, 166], target: [204, 254], zoom: "105 145 275 235", operations: ["Replace front stabilizer link", "Diagnose stabilizer link noise", "Diagnose excessive body roll"] },
    { id: "suspension-hub", label: "Wheel hub & bearing", description: "The round wheel mounting flange on the carrier.", sideRequired: true, scope: "One front hub. Review bearing type and any shared brake access labor.", callout: [530, 305], target: [409, 283], zoom: "285 175 285 220", operations: ["Replace front left wheel hub", "Replace front right wheel hub", "Diagnose wheel bearing noise", "Inspect wheel bearing play"] }
  ] },
  ...EXPANDED_VISUAL_AREAS
];

export function visualAreaForSystem(systemId: string): VisualAreaId | null {
  return VISUAL_AREAS.find((area) => area.systemId === systemId)?.id ?? null;
}

export function visualEntries(part: VisualPart, side: VehicleSide | null) {
  return CATALOG_ENTRIES.filter(({ repair }) => part.operations.includes(repair.label)
    && (!side || !/\b(left|right)\b/.test(repair.label) || repair.label.includes(side)));
}

export function visualPartForOperation(areaId: VisualAreaId, operationId: string) {
  const entry = CATALOG_ENTRIES.find(({ repair }) => repair.id === operationId);
  return VISUAL_AREAS.find((area) => area.id === areaId)?.parts.find((part) => entry && part.operations.includes(entry.repair.label));
}

export function visualEstimateRepair(repair: RepairOperation, part: VisualPart, side: VehicleSide | null): RepairOperation | null {
  if (repair.kind === "diagnosis" || !part.sideRequired) return repair;
  if (!side) return null;
  if (/\b(left|right)\b/.test(repair.label)) return repair.label.includes(side) ? repair : null;
  return { ...repair, id: `${repair.id}:front-${side}`, label: `${repair.label} · front ${side}`, catalogOperationId: repair.id, position: `front-${side}` };
}
