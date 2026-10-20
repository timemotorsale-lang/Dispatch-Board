import type { LaborRepairOperation } from "./labor-operation-taxonomy";
import { brakeOperationForId } from "@/lib/brake-baseline";
import { repairBaselineForId } from "@/lib/repair-catalog-baselines";

export const DIAGNOSTIC_ESTIMATE_PARTS_TAX_POLICY_VERSION = "DGN-ESTIMATE-PARTS-TAX/1.0.0";

export type EstimateJurisdiction = "MN";
export type EstimatePartPricingStatus = "ESTIMATED" | "PRICE_PENDING";

export type EstimateRequiredPart = {
  category: "MAJOR_COMPONENT" | "SEAL" | "FILTER" | "FLUID" | "HARDWARE" | "MATERIAL";
  description: string;
  key: string;
  laborOperationId: string;
  partNumber: string;
  pricingStatus: EstimatePartPricingStatus;
  quantity: number;
  taxable: boolean;
  unitPriceCents: number;
};

export type EstimateTaxPolicyResult = {
  jurisdiction: EstimateJurisdiction;
  laborTaxable: false;
  taxablePartsCents: number;
  taxCents: number;
  taxRate: number;
  taxSummary: string;
};

export type EstimatePartsTaxPolicyResult = {
  requiredParts: EstimateRequiredPart[];
  missingRequiredParts: EstimateRequiredPart[];
  requiredAddOnIds: string[];
  readinessCodes: string[];
  tax: EstimateTaxPolicyResult;
  version: string;
};

type ExistingPart = {
  policyRequirementKey?: string;
  laborRowId: string;
  name: string;
  number: string;
  quantity: number;
  taxable?: boolean;
  unitPrice: number;
};


const canonical = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const cents = (value: number) => Math.max(0, Math.round(value));


export function requiredPartsForLabor(operation: LaborRepairOperation): EstimateRequiredPart[] {
  const brake = brakeOperationForId(operation.id);
  if (brake) return brake.parts.map((part, index) => ({ category: "MAJOR_COMPONENT", description: part.name, key: `brake-part-${index}`, laborOperationId: operation.id, partNumber: "", pricingStatus: "PRICE_PENDING", quantity: part.quantity, taxable: true, unitPriceCents: 0 }));
  const baseline = repairBaselineForId(operation.id);
  if (baseline) return baseline.operation.parts.map((part, index) => ({ category: "MAJOR_COMPONENT", description: part.name, key: `ss-${index}`, laborOperationId: operation.id, partNumber: "", pricingStatus: "PRICE_PENDING", quantity: part.quantity, taxable: true, unitPriceCents: 0 }));
  return [];
}

export function requiredAddOnsForLabor(operation: LaborRepairOperation) {
  if (repairBaselineForId(operation.id)) return operation.requiredAddOns;
  return operation.requiredAddOns;
}

function isSamePart(requirement: EstimateRequiredPart, part: ExistingPart) {
  if (repairBaselineForId(requirement.laborOperationId)) return part.laborRowId === requirement.laborOperationId && (part.policyRequirementKey === requirement.key || canonical(part.name) === canonical(requirement.description));
  const requiredNumber = canonical(requirement.partNumber);
  const requiredDescription = canonical(requirement.description);
  const actualNumber = canonical(part.number);
  const actualName = canonical(part.name);
  return part.laborRowId === requirement.laborOperationId && (
    actualNumber === requiredNumber ||
    actualName.includes(canonical(requirement.key)) ||
    requiredDescription.includes(actualName) ||
    actualName.includes(requiredDescription.split(" ").slice(0, 2).join(" "))
  );
}

export function calculateMinnesotaEstimateTax(parts: ExistingPart[], taxRate = 0.07): EstimateTaxPolicyResult {
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 0.3) throw new Error("Invalid configured tax rate.");
  const taxablePartsCents = parts.filter((part) => part.taxable !== false).reduce((sum, part) => sum + cents(part.quantity * part.unitPrice * 100), 0);
  const taxCents = cents(taxablePartsCents * taxRate);
  return {
    jurisdiction: "MN",
    laborTaxable: false,
    taxablePartsCents,
    taxCents,
    taxRate,
    taxSummary: "MN estimate policy taxes parts/materials only; separately stated repair labor is not taxed. Rate is staff configured; confirm jurisdiction and effective date."
  };
}

export function evaluateEstimatePartsTaxPolicy(input: { labor: LaborRepairOperation[]; parts: ExistingPart[]; jurisdiction?: EstimateJurisdiction; taxRate?: number }): EstimatePartsTaxPolicyResult {
  const requiredParts = input.labor.flatMap(requiredPartsForLabor);
  const missingRequiredParts = requiredParts.filter((requirement) => !input.parts.some((part) => isSamePart(requirement, part)));
  const requiredAddOnIds = [...new Set(input.labor.flatMap(requiredAddOnsForLabor))];
  const readinessCodes = [
    requiredParts.length ? "REQUIRED_PARTS_POLICY_APPLIED" : "",
    missingRequiredParts.length ? "REQUIRED_PARTS_RECOMMENDED" : "",
    requiredParts.some((part) => part.pricingStatus === "PRICE_PENDING") ? "PART_PRICE_REVIEW_REQUIRED" : "",
    requiredAddOnIds.includes("transmission-programming-relearn") ? "PROGRAMMING_RELEARN_REQUIRED" : ""
  ].filter(Boolean);
  return {
    requiredParts,
    missingRequiredParts,
    requiredAddOnIds,
    readinessCodes,
    tax: calculateMinnesotaEstimateTax(input.parts, input.taxRate),
    version: DIAGNOSTIC_ESTIMATE_PARTS_TAX_POLICY_VERSION
  };
}
