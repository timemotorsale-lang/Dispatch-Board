export const vehiclePhotoAngles = [
  { code: "front", label: "Front" }, { code: "front_left", label: "Front left" },
  { code: "driver_side", label: "Driver side" }, { code: "rear_left", label: "Rear left" },
  { code: "rear", label: "Rear" }, { code: "rear_right", label: "Rear right" },
  { code: "passenger_side", label: "Passenger side" }, { code: "front_right", label: "Front right" },
  { code: "interior_dash", label: "Interior / dash" }, { code: "odometer", label: "Odometer" },
  { code: "damage_closeup", label: "Damage close-up" }
] as const;
export type VehiclePhotoAngle = typeof vehiclePhotoAngles[number]["code"];
export function inferVehiclePhotoAngle(name: string): VehiclePhotoAngle | null {
  const text = name.toLowerCase().replaceAll(/[_-]+/g, " ");
  // Damage takes precedence even when a filename also describes a standard angle.
  if (/damage|dent|scratch|close up|closeup/.test(text)) return "damage_closeup";
  if (/odometer|mileage|cluster/.test(text)) return "odometer";
  if (/interior|dash|cabin/.test(text)) return "interior_dash";
  for (const [code, pattern] of [["front_left", /front left|driver front/], ["front_right", /front right|passenger front/], ["rear_left", /rear left|driver rear/], ["rear_right", /rear right|passenger rear/], ["driver_side", /driver side|left side/], ["passenger_side", /passenger side|right side/], ["rear", /rear|back/], ["front", /front/]] as const) if (pattern.test(text)) return code;
  return null;
}
export function intakePhotoName(angle: unknown, name: string) {
  if (typeof name !== "string" || !name.trim()) throw new Error("File name is required.");
  if (angle !== "other" && !vehiclePhotoAngles.some(item => item.code === angle)) throw new Error("Select a valid intake photo angle.");
  return `${angle}-${name}`;
}
