import { describe, expect, it } from "vitest";

import { evaluateEstimatePartsTaxPolicy } from "@/server/diagnostics/estimate-parts-tax-policy";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";

const operations = flattenLaborOperationTaxonomy();
const transmissionReplacement = operations.find((operation) => operation.id === "transmission-remove-install");
const engineDiagnosis = operations.find((operation) => operation.id === "engine-performance-diagnosis");

describe("diagnostic estimate parts and tax policy", () => {
  it("adds the full transmission replacement accessory package", () => {
    if (!transmissionReplacement) throw new Error("Transmission replacement operation missing.");

    const result = evaluateEstimatePartsTaxPolicy({ labor: [transmissionReplacement], parts: [] });
    const descriptions = result.missingRequiredParts.map((part) => part.description);

    expect(descriptions).toContain("Transmission assembly - VIN fitment and supplier price required");
    expect(descriptions).toContain("Automatic transmission fluid - fill and level set allowance");
    expect(descriptions).toContain("Transmission filter and pan gasket kit");
    expect(descriptions).toContain("Axle/output shaft seal set");
    expect(descriptions).toContain("Torque converter/front pump seal");
    expect(descriptions).toContain("One-time-use fasteners, clips, and retainers allowance");
    expect(result.requiredAddOnIds).toEqual(expect.arrayContaining(["transmission-fluid-service", "transmission-programming-relearn"]));
    expect(result.readinessCodes).toEqual(expect.arrayContaining(["REQUIRED_PARTS_AUTO_ADDED", "PART_PRICE_REVIEW_REQUIRED", "PROGRAMMING_RELEARN_REQUIRED"]));
  });

  it("taxes Minnesota estimate parts and materials without taxing labor", () => {
    if (!transmissionReplacement) throw new Error("Transmission replacement operation missing.");

    const result = evaluateEstimatePartsTaxPolicy({
      labor: [transmissionReplacement],
      parts: [{ laborRowId: "transmission-remove-install", name: "Transmission assembly", number: "VIN-REVIEW-TRANSMISSION", quantity: 1, unitPrice: 2800, taxable: true }]
    });

    expect(result.tax.laborTaxable).toBe(false);
    expect(result.tax.taxablePartsCents).toBeGreaterThan(280000);
    expect(result.tax.taxCents).toBe(Math.round(result.tax.taxablePartsCents * 0.08));
  });

  it("does not invent parts for diagnostic-only labor", () => {
    if (!engineDiagnosis) throw new Error("Engine diagnosis operation missing.");

    const result = evaluateEstimatePartsTaxPolicy({ labor: [engineDiagnosis], parts: [] });

    expect(result.requiredParts).toEqual([]);
    expect(result.tax.taxCents).toBe(0);
  });
});
