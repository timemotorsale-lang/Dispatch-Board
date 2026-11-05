import { describe, expect, it } from "vitest";
import { EMPTY_CASH_SALE, cashSaleWarrantySelection, cashSaleError } from "@/lib/cash-retail-sale";

describe("cash sale limited-warranty defaults", () => {
  it("fills coverage and 30-day/1000-mile terms on selection for the typical mileage tier", () => {
    const facts = cashSaleWarrantySelection({ ...EMPTY_CASH_SALE, mileage: "54000", odometerStatus: "Actual" }, "Dealer limited warranty");
    expect(facts.warrantyCoverage).toContain("Powertrain (engine, transmission and drive axle)");
    expect(facts.warrantyCoverage).toContain("Minnesota-required coverage applies");
    expect(facts.warrantyDuration).toBe("30 days or 1,000 miles, whichever occurs first");
    expect(cashSaleError("Demo Buyer", "1NXBR32E85Z123456", "10000", { ...facts, buyerAddress: "100 Sample Street", saleDate: "2026-11-05" }, ["buyers-guide", "warranty-disclosure"])).toBeNull();
  });
  it("uses the longer mileage-tier term for actual mileage below 36000", () => {
    expect(cashSaleWarrantySelection({ ...EMPTY_CASH_SALE, mileage: "35999", odometerStatus: "Actual" }, "Dealer limited warranty").warrantyDuration).toBe("60 days or 2,500 miles, whichever occurs first");
    expect(cashSaleWarrantySelection({ ...EMPTY_CASH_SALE, mileage: "36000", odometerStatus: "Actual" }, "Dealer limited warranty").warrantyDuration).toContain("30 days");
  });
  it("preserves custom and saved warranty terms, filling only the blank field", () => {
    const custom = { ...EMPTY_CASH_SALE, warrantyCoverage: "Custom full coverage", warrantyDuration: "90 days or 3000 miles" };
    expect(cashSaleWarrantySelection(custom, "Dealer limited warranty")).toMatchObject({ ...custom, warrantyType: "Dealer limited warranty" });
    expect(cashSaleWarrantySelection({ ...custom, warrantyDuration: " " }, "Dealer limited warranty")).toMatchObject({ warrantyCoverage: custom.warrantyCoverage, warrantyDuration: "30 days or 1,000 miles, whichever occurs first" });
    expect(EMPTY_CASH_SALE.warrantyDuration).toBe("");
  });
  it("does not infer eligibility or add limited coverage for a no-warranty selection", () => {
    const result = cashSaleWarrantySelection(EMPTY_CASH_SALE, "No dealer warranty - eligibility reviewed");
    expect(result).toMatchObject({ warrantyCoverage: "", warrantyDuration: "", warrantyExemption: "", eligibilityReviewedBy: "" });
  });
});
