import { describe, expect, it } from "vitest";
import { dollarsToCents } from "@/features/inventory/estimate-price-correction";
describe("dollar price corrections", () => {
  it("converts $900.00 to 90000 cents, not $9.00", () => {
    expect(dollarsToCents("900.00")).toBe(90000);
    expect(dollarsToCents("9.00")).toBe(900);
    expect(dollarsToCents("900")).toBe(90000);
    expect(dollarsToCents("0.29")).toBe(29);
  });
  it("rejects incomplete or invalid amounts", () => {
    for (const input of ["", "-9", "9.999", "hello", "9.", "1e3"]) expect(dollarsToCents(input)).toBeNull();
  });
});
