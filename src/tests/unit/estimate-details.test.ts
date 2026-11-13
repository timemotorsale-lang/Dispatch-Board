import { describe, expect, it } from "vitest";
import { formatEstimateDate, normalizeEstimateCorrection } from "@/lib/estimate-details";

const correction = { estimateDate: "2026-09-26", serviceDate: "", validThrough: "", mileage: 0, unit: "MILES", reason: "Verified against the paper estimate." };

describe("estimate detail corrections", () => {
  it("preserves the historical calendar date, zero mileage, and unknown expiration", () => {
    const saved = normalizeEstimateCorrection(correction);
    expect(saved.details).toEqual({ estimateDate: "2026-09-26", serviceDate: null, validThrough: null });
    expect(saved.reading).toBe(0);
    expect(formatEstimateDate(saved.details.estimateDate!)).toBe("September 26, 2026");
  });
  it.each([
    { memo: "a".repeat(121) },
    { estimateDate: "2026-02-30" },
    { validThrough: "2026-09-25" },
    { mileage: -1 },
    { mileage: 1.5 },
    { reason: " " }
  ])("rejects invalid corrections %j", fields => {
    expect(() => normalizeEstimateCorrection({ ...correction, ...fields })).toThrow();
  });
  it("stores a short customer-facing memo", () => {
    expect(normalizeEstimateCorrection({ ...correction, memo: " Claim Authorization # 7280005 " }).details.memo).toBe("Claim Authorization # 7280005");
  });
});
