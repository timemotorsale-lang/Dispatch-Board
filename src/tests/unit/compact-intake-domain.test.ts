import { describe, expect, it } from "vitest";
import { normalizeCompactIntake } from "@/server/inventory-unit/compact-intake-domain";

const now = new Date("2026-10-18T12:00:00Z");
const details = { source: "AUCTION", seller: "Synthetic seller", boughtFrom: "Synthetic auction", buyer: "Synthetic buyer", acquiredOn: "2026-10-17", reference: "invoice-1", priceStatus: "INCURRED", purchaseCents: 1000000, proposedPriceCents: null, whereabouts: "Receiving lane", odometer: 50000, odometerUnit: "MILES", condition: "Runs; bumper damage recorded", keys: 2, titleStatus: "RECEIVED", documents: "Invoice attached", pendingNotes: "" };
const input = { action: "SAVE_INVENTORY", idempotencyKey: "compact-1", reason: "Record acquisition intake", vehicleId: "vehicle-1", locationId: "location-1", ownerUserId: "owner-1", expectedIntakeVersion: 0, expectedUnitVersion: null, ownershipConfirmed: false, details };

describe("compact intake contract", () => {
  it("preserves explicit ownership and integer versions for existing canonical vehicles", () => {
    expect(normalizeCompactIntake(input, now)).toMatchObject({ vehicleId: "vehicle-1", ownershipConfirmed: false, expectedIntakeVersion: 0, expectedUnitVersion: null, details });
  });

  it("normalizes exact VIN before identity resolution", () => {
    expect(normalizeCompactIntake({ ...input, vehicleId: undefined, vin: "1hgcm82633a004352", year: 2003, make: "Honda", model: "Accord", ownershipConfirmed: true }, now)).toMatchObject({ vehicleId: null, vin: "1HGCM82633A004352", year: 2003 });
  });

  it("preserves missing purchase amount as explicitly pending", () => {
    expect(normalizeCompactIntake({ ...input, details: { ...details, purchaseCents: null, priceStatus: "PENDING", reference: "", pendingNotes: "Acquisition owner will confirm invoice amount" } }, now).details).toMatchObject({ purchaseCents: null, priceStatus: "PENDING", reference: "" });
  });

  it.each([
    { expectedIntakeVersion: "0" }, { expectedIntakeVersion: -1 }, { expectedUnitVersion: undefined },
    { expectedUnitVersion: "1" }, { expectedUnitVersion: 0 }, { expectedUnitVersion: -1 },
    { ownershipConfirmed: undefined }, { ownershipConfirmed: "true" }, { action: "DRAFT" },
    { vehicleId: undefined }, { vin: "invalid" }, { year: "2003" },
    { locationId: "" }, { ownerUserId: "" }, { reason: "short" }, { idempotencyKey: "" },
    { action: "SAVE_AND_START_RO", concern: "" },
  ])("rejects invalid command fields %j", override => {
    expect(() => normalizeCompactIntake({ ...input, ...override }, now)).toThrow();
  });

  it.each([
    { source: "" }, { source: "UNKNOWN" }, { acquiredOn: "" }, { acquiredOn: "2026-02-30" },
    { acquiredOn: "2026-10-19" }, { purchaseCents: 0 }, { purchaseCents: -1 },
    { purchaseCents: null }, { priceStatus: "PENDING" },
    { condition: "ok" }, { whereabouts: "" },
  ])("rejects unsupported or unconfirmed acquisition details %j", override => {
    expect(() => normalizeCompactIntake({ ...input, details: { ...details, ...override } }, now)).toThrow();
  });

  it("accepts a purchase without an optional invoice reference", () => {
    expect(normalizeCompactIntake({ ...input, details: { ...details, reference: "" } }, now).details.reference).toBe("");
  });
  it("retains missing paperwork as pending without mandatory follow-up notes", () => {
    expect(normalizeCompactIntake({ ...input, details: { ...details, seller: "", titleStatus: "PENDING", documents: "", pendingNotes: "" } }, now).details).toMatchObject({ seller: "", titleStatus: "PENDING", documents: "", pendingNotes: "" });
  });
  it("requires a real concern to start repair work", () => {
    expect(normalizeCompactIntake({ ...input, action: "SAVE_AND_START_RO", concern: "Check brake vibration" }, now).concern).toBe("Check brake vibration");
  });
});
