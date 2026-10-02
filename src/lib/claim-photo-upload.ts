export const CLAIM_PHOTO_MAX_BYTES = 25 * 1024 * 1024;
export const CLAIM_PHOTO_ACCEPT = "image/jpeg,image/png";
export type ClaimPhotoCategory = "DAMAGE_PHOTO" | "ODOMETER_PHOTO" | "VIN_PHOTO";

export function claimPhotoCategory(task: { title: string; actionLabel: string }): ClaimPhotoCategory | null {
  const label = `${task.title} ${task.actionLabel}`.toLowerCase();
  if (label.includes("odometer")) return "ODOMETER_PHOTO";
  if (label.includes("vin") && label.includes("photo")) return "VIN_PHOTO";
  if (label.includes("photo")) return "DAMAGE_PHOTO";
  return null;
}

export function validateClaimPhoto(file: { type: string; size: number }) {
  if (!["image/jpeg", "image/png"].includes(file.type)) return "Select a JPEG or PNG photo.";
  if (!file.size) return "This photo is empty.";
  if (file.size > CLAIM_PHOTO_MAX_BYTES) return "Each photo must be 25 MB or smaller.";
  return null;
}

export function matchesClaimPhotoBytes(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return type === "image/png" && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
}
