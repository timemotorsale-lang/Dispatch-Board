export const VEHICLE_GROUPS = [
  { id: "sedan", label: "Sedan", body: "sedan", door: "hinged", rear: "decklid", roof: 167, length: 790 },
  { id: "coupe", label: "Coupe / convertible", body: "coupe", door: "two", rear: "decklid", roof: 175, length: 770 },
  { id: "hatchback", label: "Hatchback / wagon", body: "hatch", door: "hinged", rear: "liftgate", roof: 156, length: 770 },
  { id: "crossover", label: "Crossover / compact SUV", body: "suv", door: "hinged", rear: "liftgate", roof: 137, length: 770 },
  { id: "suv", label: "Midsize SUV", body: "suv", door: "hinged", rear: "liftgate", roof: 118, length: 790 },
  { id: "full-suv", label: "Full-size SUV", body: "suv", door: "hinged", rear: "liftgate", roof: 100, length: 825 },
  { id: "minivan", label: "Minivan", body: "minivan", door: "sliding", rear: "liftgate", roof: 112, length: 810 },
  { id: "van", label: "Cargo / passenger van", body: "van", door: "sliding", rear: "cargo", roof: 82, length: 825 },
  { id: "pickup", label: "Pickup truck", body: "pickup", door: "hinged", rear: "tailgate", roof: 130, length: 825 },
  { id: "box-truck", label: "Box / commercial truck", body: "truck", door: "two", rear: "cargo-box", roof: 72, length: 835 },
  { id: "bus", label: "Bus / shuttle", body: "bus", door: "entry", rear: "rear-panel", roof: 72, length: 835 },
] as const;
export type VehicleGroup = typeof VEHICLE_GROUPS[number];
export type GroupView = "left" | "right" | "front" | "rear" | "top";
export const GROUP_VIEWS: GroupView[] = ["left", "right", "front", "rear", "top"];
export function vehicleGroup(id: string): VehicleGroup { return VEHICLE_GROUPS.find(group => group.id === id) ?? VEHICLE_GROUPS[0]; }
export function groupComponents(group: VehicleGroup, view: GroupView): string[] {
  const side = view === "right" ? "right" : "left";
  if (view === "front") return ["hood", "windshield", "front-cover", "grille", "left-headlamp", "right-headlamp"];
  if (view === "rear") return [group.rear === "cargo" ? "left-cargo-door" : group.rear, ...(group.rear === "cargo" ? ["right-cargo-door"] : []), "tail-lamp", "rear-cover"];
  if (view === "top") return ["hood", "windshield", "roof-panel", ...(group.rear === "decklid" ? ["back-glass", "decklid"] : group.body === "pickup" ? ["truck-bed"] : [])];
  if (group.body === "bus") return [...(view === "right" ? ["bus-entry"] : []), "bus-side", "roof-panel", "rear-cover", "front-cover"];
  if (group.body === "truck") return [`${side}-front-door`, `${side}-mirror`, "cargo-box", "front-cover"];
  return [`${side}-fender`, `${side}-front-door`, ...(group.door === "two" ? [] : [`${side}-${group.door === "sliding" ? "sliding" : "rear"}-door`]), ...(group.body === "pickup" ? ["truck-bed", "tailgate"] : [`${side}-quarter`]), `${side}-rocker`, `${side}-mirror`];
}
