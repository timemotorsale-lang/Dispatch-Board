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

export function customerCaptureHref(customerId: string, tool: CaptureToolKey | null = null) {
  const returnTo = `/crm-next/customers/${encodeURIComponent(customerId)}#documents-held`;
  const params = new URLSearchParams({ returnTo, destination: "CUSTOMER", ownerId: customerId, requireDestination: "1" });
  if (tool) params.set("tool", tool);
  if (tool === "id-front" || tool === "id-barcode") params.set("kind", "ID");
  return `/capture?${params}`;
}

export function dealCaptureHref(dealId: string, customerId: string) {
  const returnTo = `/crm-next/deals/start?${new URLSearchParams({ draftId: dealId, section: "documents" })}`;
  return `/capture?${new URLSearchParams({ returnTo, destination: "CUSTOMER", ownerId: customerId, dealId, requireDestination: "1" })}`;
}

export function vehicleCaptureHref(vehicleId: string, returnTo: string) {
  return `/capture?${new URLSearchParams({ returnTo: captureReturnHref(returnTo), destination: "VEHICLE", ownerId: vehicleId, requireDestination: "1" })}`;
}

export function captureToolHref(tool: CaptureToolKey | null, returnTo: string) {
  const params = new URLSearchParams({ returnTo: captureReturnHref(returnTo) });
  const selected = tool ? captureToolFromQuery(tool) : null;
  if (selected) { params.set("tool", selected.key); params.set("kind", selected.kind); params.set("destination", selected.destination); }
  return `/capture?${params}`;
}
