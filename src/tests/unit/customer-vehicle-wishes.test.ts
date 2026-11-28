import { describe, expect, it } from "vitest";
import { parseVehicleWish } from "@/lib/customer-vehicle-wishes";

describe("structured customer vehicle wishes", () => {
  it("accepts partial preferences and trims text", () => {
    expect(parseVehicleWish({ make: " Toyota " })).toEqual({
      year: null, make: "Toyota", model: null, color: null, maxPriceCents: null, monthlyPaymentCents: null
    });
  });

  it("keeps price and monthly payment separate, in exact cents", () => {
    expect(parseVehicleWish({ year: "2022", maxPrice: "25000.50", monthlyPayment: "399.09" })).toMatchObject({
      year: 2022, maxPriceCents: 2500050, monthlyPaymentCents: 39909
    });
  });

  it.each([{}, { color: "  " }, { year: "23" }, { year: "2222" }, { maxPrice: "0" }, { maxPrice: "-20" },
    { maxPrice: "1e4" }, { monthlyPayment: "20.999" }, { monthlyPayment: 100 }, { make: "x".repeat(61) }
  ])("rejects empty or invalid preferences: %j", input => {
    expect(() => parseVehicleWish(input)).toThrow();
  });
});
