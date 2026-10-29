import { serviceQuoteTax } from "./service-charges";
import { estimateReviewScope, type ReviewLine } from "./estimate-review";
import { brakeOperationForId, brakeScopeConflict } from "./brake-baseline";
import { steeringOperationForId, steeringScopeConflict } from "./steering-baseline";
import { LIGHT_DUTY_SYSTEMS, lightDutyOperationForId, lightDutyScopeConflict } from "./light-duty-baseline";

export type EstimatePricing = { laborRate: number; partsMarkupPercent: number; taxRatePercent: number | null; taxReference: string; reason: string; overrideReason?: string; ratePolicyId?: string; ratePolicyVersion?: number };
export const initialEstimatePricing: EstimatePricing = { laborRate: 125, partsMarkupPercent: 35, taxRatePercent: 7, taxReference: "", reason: "Use the active shop labor-rate policy. Confirm retail parts and applicable tax before presentation." };
export type SteeringReview = { configuration: string; procedureReference: string; verificationPlan: string; alignmentDecision: "" | "SEPARATE_LINE" | "INCLUDED_IN_SCOPE" | "NOT_REQUIRED" | "OUTSOURCE"; alignmentReason: string };
export type SystemScopeReview = { configuration: string; procedureReference: string; verificationPlan: string; capabilityPlan: string };
export type EstimateControls = { version: 1; pricing: EstimatePricing; fitment: Record<string, string>; overlapResolution: string; reviewedScope: string; brakeReview?: { configuration: string; procedureReference: string; verificationPlan: string }; steeringReview?: SteeringReview; systemReviews?: Record<string, SystemScopeReview> };
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
  if (controls.systemReviews !== undefined) {
    if (!controls.systemReviews || typeof controls.systemReviews !== "object" || Array.isArray(controls.systemReviews) || Object.keys(controls.systemReviews).length > 10) throw new Error("Invalid expanded system reviews.");
    for (const [systemId, review] of Object.entries(controls.systemReviews)) {
      if (!LIGHT_DUTY_SYSTEMS.some(system => system.id === systemId) || !review || typeof review !== "object" || Array.isArray(review)) throw new Error("Invalid expanded system review.");
      for (const field of ["configuration", "procedureReference", "verificationPlan", "capabilityPlan"] as const) if (typeof review[field] !== "string" || review[field].length > 2000) throw new Error("Invalid expanded system reference.");
    }
  }
  if (controls.steeringReview !== undefined) {
    const review = controls.steeringReview;
    if (!review || typeof review !== "object" || Array.isArray(review)) throw new Error("Invalid steering review.");
    for (const field of ["configuration", "procedureReference", "verificationPlan", "alignmentReason"] as const) if (typeof review[field] !== "string" || review[field].length > 2000) throw new Error("Invalid steering review reference.");
    if (!["", "SEPARATE_LINE", "INCLUDED_IN_SCOPE", "NOT_REQUIRED", "OUTSOURCE"].includes(review.alignmentDecision)) throw new Error("Invalid alignment decision.");
  }
  if (controls.brakeReview !== undefined) {
    if (!controls.brakeReview || typeof controls.brakeReview !== "object" || Array.isArray(controls.brakeReview)) throw new Error("Invalid brake review.");
    for (const field of ["configuration", "procedureReference", "verificationPlan"] as const) if (typeof controls.brakeReview[field] !== "string" || controls.brakeReview[field].length > 2000) throw new Error("Invalid brake review reference.");
  }
  if (controls.version !== 1 || !controls.fitment || typeof controls.fitment !== "object" || Array.isArray(controls.fitment) || Object.keys(controls.fitment).length > 300) throw new Error("Invalid estimate controls.");
  for (const [key, reference] of Object.entries(controls.fitment)) if (key.length > 200 || typeof reference !== "string" || reference.length > 500) throw new Error("Invalid fitment reference.");
  if (typeof controls.overlapResolution !== "string" || controls.overlapResolution.length > 2000 || typeof controls.reviewedScope !== "string" || controls.reviewedScope.length > 180000) throw new Error("Invalid estimate review scope.");
  return { ...controls, pricing: validateEstimatePricing(controls.pricing) };
}

export function estimateControlsScope(vehicleId: string, lines: ReviewLine[], controls: Omit<EstimateControls, "reviewedScope">) {
  return JSON.stringify({ work: estimateReviewScope(vehicleId, lines), taxability: lines.map(line => ({ key: line.key, taxable: (line as ReviewLine & { taxable?: boolean }).taxable === true })), pricing: validateEstimatePricing(controls.pricing), fitment: Object.entries(controls.fitment).sort(([left], [right]) => left.localeCompare(right)), overlapResolution: controls.overlapResolution, ...(controls.brakeReview ? { brakeReview: controls.brakeReview } : {}), ...(controls.steeringReview ? { steeringReview: controls.steeringReview } : {}), ...(controls.systemReviews ? { systemReviews: Object.fromEntries(Object.entries(controls.systemReviews).sort(([left], [right]) => left.localeCompare(right))) } : {}) });
}

export function checkStaffQuotePricing(lines: ReviewLine[], controls: EstimateControls, labor: LaborScope[], taxCents: number, discountCents = 0) {
  const checked = validateEstimateControls(controls);
  const pricing = checked.pricing;
  if (pricing.taxRatePercent === null) throw new Error("Enter a tax rate.");
  if (labor.some((line, index) => labor.slice(index + 1).some(other => lightDutyScopeConflict(line.id, other.id) || steeringScopeConflict(line.id, other.id) || brakeScopeConflict(line.id, other.id)))) throw new Error("Remove duplicate or overlapping work.");
  const taxable = lines.filter(line => line.type === "PART" ? (line as ReviewLine & { taxable?: boolean }).taxable !== false : line.type === "FEE" && (line as ReviewLine & { taxable?: boolean }).taxable === true).reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  if (taxCents !== serviceQuoteTax(subtotal, taxable, pricing.taxRatePercent, discountCents)) throw new Error("Tax does not match the estimate.");
  for (const line of lines.filter(item => item.type === "LABOR")) {
    if (line.quantity !== 1 || line.unitPriceCents !== Math.round(line.laborGuideMinutes / 60 * pricing.laborRate * 100)) throw new Error("Labor amount does not match the hours and rate.");
  }
  return checked;
}

export function checkEstimateControls(vehicleId: string, lines: ReviewLine[], controls: EstimateControls, labor: LaborScope[], taxCents: number) {
  const checked = validateEstimateControls(controls);
  const pricing = checked.pricing;
  const expandedSystems = new Set(labor.flatMap(line => { const operation = lightDutyOperationForId(line.id); return operation ? [operation.systemId] : []; }));
  for (const systemId of expandedSystems) {
    const review = checked.systemReviews?.[systemId];
    if (!review || [review.configuration, review.procedureReference, review.verificationPlan, review.capabilityPlan].some(reference => !reference.trim())) throw new Error(`Confirm ${systemId} configuration, procedure, verification and capability or referral plan before presentation.`);
  }
  if (labor.some((line, index) => labor.slice(index + 1).some(other => lightDutyScopeConflict(line.id, other.id)))) throw new Error("Remove expanded-catalog work already included in a selected package or incompatible alternative; an overlap note cannot authorize duplicate scope.");
  if (labor.some(line => steeringOperationForId(line.id))) {
    const review = checked.steeringReview;
    if (!review || [review.configuration, review.procedureReference, review.verificationPlan, review.alignmentReason].some(reference => !reference.trim()) || !review.alignmentDecision) throw new Error("Confirm steering/suspension configuration, procedure, verification and alignment decision before presentation.");
    const hasAlignment = labor.some(line => steeringOperationForId(line.id)?.groupId === "steering-alignment" && /^(Perform|Adjust)/.test(steeringOperationForId(line.id)!.label));
    if (review.alignmentDecision === "SEPARATE_LINE" && !hasAlignment) throw new Error("Add the reviewed alignment operation, or revise the alignment decision before presentation.");
    if (["INCLUDED_IN_SCOPE", "NOT_REQUIRED", "OUTSOURCE"].includes(review.alignmentDecision) && hasAlignment) throw new Error("The alignment decision conflicts with a separate alignment labor line. Remove that line or select separate-line alignment.");
    if (labor.some((line, index) => labor.slice(index + 1).some(other => steeringScopeConflict(line.id, other.id)))) throw new Error("Remove steering/suspension work already included in a selected package or incompatible alternative; an overlap note cannot authorize duplicate scope.");
  }
  if (labor.some(line => brakeOperationForId(line.id))) {
    if (!checked.brakeReview || [checked.brakeReview.configuration, checked.brakeReview.procedureReference, checked.brakeReview.verificationPlan].some(reference => !reference.trim())) throw new Error("Confirm brake configuration, vehicle-specific procedure reference and verification plan before presentation.");
    if (labor.some((line, index) => labor.slice(index + 1).some(other => brakeScopeConflict(line.id, other.id)))) throw new Error("Remove brake work already included in a selected package; an overlap note cannot authorize duplicate scope.");
  }
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
