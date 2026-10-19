import { describe, expect, it } from "vitest";

import { evaluateEstimatePartsTaxPolicy } from "@/server/diagnostics/estimate-parts-tax-policy";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";

const operations = flattenLaborOperationTaxonomy();
const transmissionReplacement = operations.find((operation) => operation.id === "transmission-remove-install");
const engineDiagnosis = operations.find((operation) => operation.id === "engine-performance-diagnosis");

describe("diagnostic estimate parts and tax policy", () => {
  it("keeps removal/reinstallation materials unpriced and follow-up work conditional", () => {
    if (!transmissionReplacement) throw new Error("Transmission replacement operation missing.");

    const result = evaluateEstimatePartsTaxPolicy({ labor: [transmissionReplacement], parts: [] });
    const descriptions = result.missingRequiredParts.map((part) => part.description);

    expect(descriptions).toHaveLength(1);
    expect(descriptions[0]).toContain("no replacement assembly assumed");
    expect(result.requiredParts[0]).toMatchObject({ unitPriceCents: 0, partNumber: "", pricingStatus: "PRICE_PENDING" });
    expect(result.requiredAddOnIds).toEqual([]);
    expect(result.readinessCodes).toContain("PART_PRICE_REVIEW_REQUIRED");
  });

  it("taxes Minnesota estimate parts and materials without taxing labor", () => {
    if (!transmissionReplacement) throw new Error("Transmission replacement operation missing.");

    const result = evaluateEstimatePartsTaxPolicy({
      labor: [transmissionReplacement],
      parts: [{ laborRowId: "transmission-remove-install", name: "Transmission assembly", number: "VIN-REVIEW-TRANSMISSION", quantity: 1, unitPrice: 2800, taxable: true }]
    });

    expect(result.tax.laborTaxable).toBe(false);
    expect(result.tax.taxablePartsCents).toBe(280000);
    expect(result.tax.taxCents).toBe(Math.round(result.tax.taxablePartsCents * 0.07));
  });

  it("does not invent parts for diagnostic-only labor", () => {
    if (!engineDiagnosis) throw new Error("Engine diagnosis operation missing.");

    const result = evaluateEstimatePartsTaxPolicy({ labor: [engineDiagnosis], parts: [] });

    expect(result.requiredParts).toEqual([]);
    expect(result.tax.taxCents).toBe(0);
  });
});
