import { describe, expect, it } from "vitest";
import { deriveStockNumberFromVin, isValidVin, normalizeCanonicalVin, normalizeStockNumber, normalizeVehicleIdentity, odometerDisposition, previewVehicleImportRows } from "@/server/vehicle-registry/domain";

describe("canonical vehicle registry domain", () => {
  it("normalizes and validates ISO VIN check digits", () => {
    expect(isValidVin("1HGCM82633A004352")).toBe(true);
    expect(normalizeCanonicalVin({ vin: "1hg-cm82633a004352" })).toMatchObject({ normalized: "1HGCM82633A004352", state: "VALID" });
    expect(() => normalizeCanonicalVin({ vin: "1HGCM82633A004351" })).toThrow("correct check digit");
  });

  it("requires a documented non-VIN exception", () => {
    expect(normalizeCanonicalVin({ nonVinReason: "Legacy asset without an assigned VIN." })).toMatchObject({ normalized: null, state: "NON_VIN_EXCEPTION" });
    expect(() => normalizeCanonicalVin({ nonVinReason: "missing" })).toThrow("at least 10");
  });

  it("normalizes stock identity and validates vehicle fields", () => {
    expect(normalizeStockNumber(" tms-10 01 ")).toEqual({ raw: "tms-10 01", normalized: "TMS1001" });
    expect(normalizeVehicleIdentity({ vehicleNumber: "unit-1", vin: "1HGCM82633A004352", stockNumber: "A-1", year: 2003, reason: "Create a governed vehicle identity.", idempotencyKey: "one" })).toMatchObject({ vehicleNumber: "UNIT-1", stockNumberNormalized: "A1", vin: "1HGCM82633A004352" });
  });

  it("derives stock from the last six VIN characters when stock is blank", () => {
    expect(deriveStockNumberFromVin("1HGCM82633A004352")).toBe("004352");
    expect(deriveStockNumberFromVin("JA4J3VA87SZ029081")).toBe("029081");
    expect(normalizeVehicleIdentity({ vehicleNumber: "unit-1", vin: "1HGCM82633A004352", year: 2003, reason: "Create a governed vehicle identity.", idempotencyKey: "one" })).toMatchObject({ stockNumber: "004352", stockNumberNormalized: "004352" });
  });

  it("flags decreasing and implausible odometer observations without overwriting history", () => {
    const latest = { reading: 50_000, observedAt: new Date("2026-07-01T00:00:00Z") };
    expect(odometerDisposition({ latest, observedAt: new Date("2026-07-10T00:00:00Z"), reading: 49_000 }).status).toBe("EXCEPTION");
    expect(odometerDisposition({ latest, observedAt: new Date("2026-07-10T00:00:00Z"), reading: 50_900 }).status).toBe("ACCEPTED");
    expect(odometerDisposition({ correctionOfId: "reading-1", latest, observedAt: new Date(), reading: 49_000 }).status).toBe("CORRECTED");
  });

  it("previews imports without accepting invalid rows", () => {
    const result = previewVehicleImportRows([{ vehicleNumber: "one", vin: "1HGCM82633A004352" }, { vehicleNumber: "two", vin: "bad" }]);
    expect(result.map((row) => row.status)).toEqual(["VALID", "INVALID"]);
  });
});
