import { describe, expect, it } from "vitest";
import { copyEstimateForRevision } from "@/lib/estimate-revision";

describe("estimate revision draft", () => {
  it("copies all line types and commercial terms without copying approval", () => {
    const source = { id: "estimate-1", version: 1, taxCents: 321, discountCents: 123, taxBoundary: "Shop tax rule", presentationChannel: "EMAIL", assumptions: "Check applicability", optionGroups: [{ title: "Options" }], authorizations: [{ disposition: "ACCEPTED" }], lineItems: (["LABOR", "PART", "FEE"] as const).map((type, index) => ({ key: `LINE-${index}`, type, description: type, quantity: 1, unitPriceCents: 900, taxable: true, workTypeCode: type, laborGuideMinutes: 60, plannedCorrection: "Repair" })) };
    const copy = copyEstimateForRevision(source);
    expect(copy.lineItems).toEqual(source.lineItems);
    expect(copy).toMatchObject({ taxCents: 321, discountCents: 123, taxBoundary: "Shop tax rule", presentationChannel: "EMAIL" });
    expect(copy).not.toHaveProperty("authorizations");
    copy.lineItems[0].unitPriceCents = 10000;
    copy.optionGroups[0].title = "Changed";
    expect(source.lineItems[0].unitPriceCents).toBe(900);
    expect(source.optionGroups[0].title).toBe("Options");
  });
});
