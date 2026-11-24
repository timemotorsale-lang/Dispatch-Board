import { describe, expect, it } from "vitest";
import { rentalCheckoutDefaults, rentalLocalTime, rentalTimeIso } from "@/lib/rental-checkout";
import { normalizeVehicleUseCommand } from "@/lib/deal-continuity";
describe("rental checkout preparation", () => {
  it("carries saved rental dates and vehicle readings into checkout without inventing actual handover", () => {
    const snapshot: Record<string, unknown> = { "daily-rental:rentalFacts": { pickupDate: "2026-11-03", pickupTime: "10:00", dropoffDate: "2026-11-08", dropoffTime: "16:30", fuelOut: "Full" }, "daily-rental:vehicleFacts": { mileageOut: "45000" } };
    expect(rentalCheckoutDefaults(key => snapshot[key], "daily-rental")).toEqual({ startsAt: "2026-11-03T10:00", expectedReturnAt: "2026-11-08T16:30", fuel: "Full", odometer: "45000" });
    expect(rentalCheckoutDefaults(() => null, "daily-rental").expectedReturnAt).toBe("");
  });
  it("accepts one activation command without a separately created reservation", () => {
    const result = normalizeVehicleUseCommand({ action: "ACTIVATE", operationKey: "activate-12345678", reason: "Actual customer pickup", occurredAt: "2026-01-01T16:00:00Z", expectedReturnAt: "2026-01-04T16:00:00Z", odometer: 1000, fuel: "Full", condition: "Inspected", recipient: "Customer", keysVerified: true, driverVerified: true, evidence: ["inspection"] });
    expect(result).toMatchObject({ action: "HANDOFF", activate: true, expectedVersion: 1, bookingId: "" });
    expect(result.startsAt).toEqual(result.occurredAt);
  });
  it("uses Chicago wall time year-round and requires a decision for the repeated hour", () => {
    expect(rentalTimeIso("2026-07-15T16:30")).toBe("2026-07-15T21:30:00.000Z");
    expect(rentalTimeIso("2026-11-05T16:30")).toBe("2026-11-05T22:30:00.000Z");
    expect(rentalLocalTime("2026-11-05T22:30:00Z")).toBe("2026-11-05T16:30");
    expect(() => rentalTimeIso("2026-03-08T02:15")).toThrow("not a valid Chicago local time");
    expect(() => rentalTimeIso("2026-11-01T01:15")).toThrow("repeated Chicago hour");
    expect(rentalTimeIso("2026-11-01T01:15", "first")).toBe("2026-11-01T06:15:00.000Z");
    expect(rentalTimeIso("2026-11-01T01:15", "second")).toBe("2026-11-01T07:15:00.000Z");
  });
});
