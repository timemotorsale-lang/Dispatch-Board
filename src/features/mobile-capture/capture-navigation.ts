export const MOBILE_HOME_HREF = "/?view=mobile";

export const captureTools = [
  { key: "photo", label: "Take a photo", detail: "Camera photos and attachments", kind: "PHOTO", destination: "GENERAL" },
  { key: "barcode", label: "VIN / barcode / QR", detail: "Read a vehicle label or code", kind: "AUTO", destination: "VEHICLE" },
  { key: "id-front", label: "ID front / back", detail: "Read and review ID information", kind: "ID", destination: "CUSTOMER" },
  { key: "id-barcode", label: "ID barcode", detail: "Read the barcode on the back", kind: "ID", destination: "CUSTOMER" },
  { key: "document", label: "Scan a document", detail: "Crop pages and create a PDF", kind: "DOCUMENT", destination: "GENERAL" }
] as const;
export type CaptureToolKey = typeof captureTools[number]["key"];

export function captureToolFromQuery(value: string | null) {
  return captureTools.find((tool) => tool.key === value) ?? null;
}

export function captureReturnHref(returnTo?: string | string[] | null) {
  return typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\") && returnTo.length <= 2000 && !Array.from(returnTo).some((character) => character.charCodeAt(0) < 32) ? returnTo : MOBILE_HOME_HREF;
}

export function captureIntakeHref(intake: "vehicle" | "customer", returnTo: string) {
  return `/capture/${intake}?${new URLSearchParams({ returnTo: captureReturnHref(returnTo) })}`;
}

export function captureToolHref(tool: CaptureToolKey | null, returnTo: string) {
  const params = new URLSearchParams({ returnTo: captureReturnHref(returnTo) });
  const selected = tool ? captureToolFromQuery(tool) : null;
  if (selected) { params.set("tool", selected.key); params.set("kind", selected.kind); params.set("destination", selected.destination); }
  return `/capture?${params}`;
}
