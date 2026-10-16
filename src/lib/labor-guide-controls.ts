import { estimateReviewScope, type ReviewLine } from "./estimate-review";

export type EstimatePricing = { laborRate: number; partsMarkupPercent: number; taxRatePercent: number | null; taxReference: string; reason: string; overrideReason?: string; ratePolicyId?: string; ratePolicyVersion?: number };
export const initialEstimatePricing: EstimatePricing = { laborRate: 125, partsMarkupPercent: 35, taxRatePercent: 7, taxReference: "", reason: "Use the active shop labor-rate policy. Confirm retail parts and applicable tax before presentation." };
export type EstimateControls = { version: 1; pricing: EstimatePricing; fitment: Record<string, string>; overlapResolution: string; reviewedScope: string };
export type LaborScope = { id: string; title: string; hours: number; overlapGroup: string | null };

export function laborOverlapGroups(labor: LaborScope[]) {
  const groups = new Map<string, LaborScope[]>();
  for (const line of labor) if (line.overlapGroup) groups.set(line.overlapGroup, [...(groups.get(line.overlapGroup) ?? []), line]);
  return [...groups].filter(([, lines]) => lines.length > 1).map(([group, lines]) => ({ group, lines }));
}

export function validateEstimatePricing(value: unknown): EstimatePricing {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Estimate pricing is required.");
  const pricing = value as EstimatePricing;
  for (const [key, maximum] of [["laborRate", 1000], ["partsMarkupPercent", 1000], ["taxRatePercent", 30]] as const) {
    const amount = pricing[key];
    if (key === "taxRatePercent" && amount === null) continue;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > maximum) throw new Error("Invalid estimate pricing rate.");
  }
  for (const key of ["taxReference", "reason"] as const) if (typeof pricing[key] !== "string" || pricing[key].length > 500) throw new Error("Invalid pricing reference or reason.");
  if (pricing.overrideReason !== undefined && (typeof pricing.overrideReason !== "string" || pricing.overrideReason.length > 500)) throw new Error("Invalid rate override reason.");
  if (pricing.ratePolicyId !== undefined && (typeof pricing.ratePolicyId !== "string" || pricing.ratePolicyId.length > 100)) throw new Error("Invalid rate policy reference.");
  if (pricing.ratePolicyVersion !== undefined && (!Number.isSafeInteger(pricing.ratePolicyVersion) || pricing.ratePolicyVersion < 0)) throw new Error("Invalid rate policy version.");
  return { laborRate: pricing.laborRate, partsMarkupPercent: pricing.partsMarkupPercent, taxRatePercent: pricing.taxRatePercent, taxReference: pricing.taxReference, reason: pricing.reason, overrideReason: pricing.overrideReason, ratePolicyId: pricing.ratePolicyId, ratePolicyVersion: pricing.ratePolicyVersion };
}

export function validateEstimateControls(value: unknown): EstimateControls {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Pricing, fitment and overlap review is required.");
  const controls = value as EstimateControls;
  if (controls.version !== 1 || !controls.fitment || typeof controls.fitment !== "object" || Array.isArray(controls.fitment) || Object.keys(controls.fitment).length > 300) throw new Error("Invalid estimate controls.");
  for (const [key, reference] of Object.entries(controls.fitment)) if (key.length > 200 || typeof reference !== "string" || reference.length > 500) throw new Error("Invalid fitment reference.");
  if (typeof controls.overlapResolution !== "string" || controls.overlapResolution.length > 2000 || typeof controls.reviewedScope !== "string" || controls.reviewedScope.length > 180000) throw new Error("Invalid estimate review scope.");
  return { ...controls, pricing: validateEstimatePricing(controls.pricing) };
}

export function estimateControlsScope(vehicleId: string, lines: ReviewLine[], controls: Omit<EstimateControls, "reviewedScope">) {
  return JSON.stringify({ work: estimateReviewScope(vehicleId, lines), taxability: lines.map(line => ({ key: line.key, taxable: (line as ReviewLine & { taxable?: boolean }).taxable === true })), pricing: validateEstimatePricing(controls.pricing), fitment: Object.entries(controls.fitment).sort(([left], [right]) => left.localeCompare(right)), overlapResolution: controls.overlapResolution });
}

export function checkEstimateControls(vehicleId: string, lines: ReviewLine[], controls: EstimateControls, labor: LaborScope[], taxCents: number) {
  const checked = validateEstimateControls(controls);
  const pricing = checked.pricing;
  if (pricing.taxRatePercent === null || !pricing.taxReference.trim() || !pricing.reason.trim()) throw new Error("Confirm the tax rate, source and pricing reason before presentation.");
  if (lines.some(line => line.type === "PART" && !checked.fitment[line.key]?.trim())) throw new Error("Record vehicle fitment and pricing verification for every part line.");
  if (laborOverlapGroups(labor).length && !checked.overlapResolution.trim()) throw new Error("Review shared labor and document adjusted hours or why no deduction applies.");
  if (checked.reviewedScope !== estimateControlsScope(vehicleId, lines, checked)) throw new Error("Pricing, fitment or scope changed. Repeat the estimate controls review.");
  const taxable = lines.filter(line => line.type === "PART" && (line as ReviewLine & { taxable?: boolean }).taxable !== false).reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  if (taxCents !== Math.round(taxable * pricing.taxRatePercent / 100)) throw new Error("Tax does not match the reviewed estimate pricing.");
  for (const line of lines.filter(item => item.type === "LABOR")) {
    if (line.quantity !== 1 || line.unitPriceCents !== Math.round(line.laborGuideMinutes / 60 * pricing.laborRate * 100)) throw new Error("Labor pricing must match the reviewed hours and rate.");
  }
  return checked;
}
