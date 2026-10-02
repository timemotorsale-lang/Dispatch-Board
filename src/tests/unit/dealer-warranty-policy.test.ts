import { describe, expect, it } from "vitest";
import { dealerWarrantyDetails, dealerWarrantyError } from "@/lib/dealer-warranty-policy";

describe("dealer engine/transmission warranty policy", () => {
  it("calculates the 30-day and 24-hour deadlines and the 1,000-mile ceiling", () => {
    const result = dealerWarrantyDetails({ deliveryAt: "2026-10-01T15:00:00.000Z", deliveryMileage: "85000" });
    expect(result).toMatchObject({ startingMileage: 85000, endingMileage: 86000 });
    expect(result?.delivery).toContain("Oct 1, 2026, 10:00 AM");
    expect(result?.expires).toContain("Oct 31, 2026, 10:00 AM");
    expect(result?.returnDeadline).toContain("Oct 2, 2026, 10:00 AM");
  });

  it("uses an elapsed 24-hour return window across a daylight-saving transition", () => {
    const result = dealerWarrantyDetails({ deliveryAt: "2026-10-31T15:00:00.000Z", deliveryMileage: "0" });
    expect(result?.returnDeadline).toContain("Nov 1, 2026, 9:00 AM");
    expect(result?.endingMileage).toBe(1000);
  });

  it.each(["", "2026-02-30T15:00:00.000Z", "2026-10-01T10:00", "2026-10-01T25:00:00Z"])("rejects invalid or timezone-free delivery time %s", (deliveryAt) => {
    expect(dealerWarrantyError({ deliveryAt, deliveryMileage: "85000" })).toContain("delivery date");
  });

  it.each(["", "-1", "1.5", "abc", "9007199254740991"])("rejects invalid delivery mileage %s", (deliveryMileage) => {
    expect(dealerWarrantyError({ deliveryAt: "2026-10-01T15:00:00.000Z", deliveryMileage })).toContain("odometer");
  });
});
