import { describe, expect, it } from "vitest";
import { validatePurchaseColumnMapping } from "@/lib/purchase-column-mapping";
describe("purchase column mapping", () => {
  it("accepts explicit source mappings only", () => { expect(validatePurchaseColumnMapping({ vin: "Vehicle VIN", purchasePrice: "Hammer", seller: "" }, ["Vehicle VIN", "Hammer"])).toEqual({ vin: "Vehicle VIN", purchasePrice: "Hammer" }); });
  it("rejects missing, duplicate and unsupported allocations", () => {
    expect(() => validatePurchaseColumnMapping({}, ["VIN"])).toThrow("VIN column");
    expect(() => validatePurchaseColumnMapping({ vin: "VIN", stockNumber: "VIN" }, ["VIN"])).toThrow("one purchase field");
    expect(() => validatePurchaseColumnMapping({ vin: "Missing" }, ["VIN"])).toThrow("missing");
    expect(() => validatePurchaseColumnMapping({ vin: "VIN", publish: "Price" }, ["VIN", "Price"])).toThrow("supported");
  });
});
