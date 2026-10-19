import { describe, expect, it } from "vitest";
import { normalizeVehicleUseCommand, vehicleUseOverlaps } from "@/lib/deal-continuity";

const reserve = { action: "RESERVE", operationKey: "request-12345678", reason: "Temporary transport while lease delivery is pending", startsAt: "2026-10-01T10:00:00Z", expectedReturnAt: "2026-10-02T10:00:00Z" };
const handoff = { ...reserve, action: "HANDOFF", bookingId: "booking-1", expectedVersion: 1, occurredAt: "2026-10-01T10:00:00Z", odometer: 12000, fuel: "Full", condition: "Recorded condition report", recipient: "Test customer", evidence: ["condition-report-1"], keysVerified: true, driverVerified: true };

describe("shared deal vehicle use", () => {
  it("accepts a bounded reservation and normalizes a stable retry payload", () => {
    expect(normalizeVehicleUseCommand(reserve)).toMatchObject({ action: "RESERVE", expectedVersion: 0, operationKey: reserve.operationKey });
    expect(normalizeVehicleUseCommand(reserve)).toEqual(normalizeVehicleUseCommand(reserve));
  });
  it("rejects reversed reservation dates", () => {
    expect(() => normalizeVehicleUseCommand({ ...reserve, expectedReturnAt: reserve.startsAt })).toThrow("follow pickup");
  });
  it.each([null, [], {}, { ...reserve, action: "DELIVER_LEASE" }, { ...reserve, operationKey: "" }, { ...reserve, reason: "" }, { ...reserve, startsAt: "invalid" }])("rejects malformed requests %j", input => {
    expect(() => normalizeVehicleUseCommand(input as never)).toThrow();
  });
  it("requires actual driver verification, not printing", () => {
    expect(() => normalizeVehicleUseCommand({ ...handoff, driverVerified: false })).toThrow("Verify the current driver");
    expect(normalizeVehicleUseCommand(handoff)).toMatchObject({ action: "HANDOFF", keysVerified: true, driverVerified: true });
  });
  it.each([{ keysVerified: false }, { odometer: "" }, { odometer: -1 }, { odometer: 1.2 }, { evidence: [] }, { condition: "" }, { recipient: "" }, { fuel: "" }])("does not invent actual handoff facts %j", input => {
    expect(() => normalizeVehicleUseCommand({ ...handoff, ...input })).toThrow();
  });
  it("rejects future handoffs and stale versions", () => {
    expect(() => normalizeVehicleUseCommand({ ...handoff, occurredAt: new Date(Date.now() + 3600000).toISOString() })).toThrow("future");
    expect(() => normalizeVehicleUseCommand({ ...handoff, expectedVersion: 0 })).toThrow("Reload");
  });
  it("accepts actual return without pretending to verify driver coverage again", () => {
    expect(normalizeVehicleUseCommand({ ...handoff, action: "RETURN", driverVerified: false })).toMatchObject({ action: "RETURN" });
  });
  it("allows adjacent reservations but blocks overlapping ones", () => {
    const booking = { status: "RESERVED", startsAt: new Date(reserve.startsAt), expectedReturnAt: new Date(reserve.expectedReturnAt) };
    expect(vehicleUseOverlaps(booking, booking.expectedReturnAt, new Date("2026-10-03"))).toBe(false);
    expect(vehicleUseOverlaps(booking, booking.startsAt, booking.expectedReturnAt)).toBe(true);
  });
  it("blocks an overdue checked-out vehicle until its actual return", () => {
    expect(vehicleUseOverlaps({ status: "CHECKED_OUT", startsAt: new Date("2020-01-01"), expectedReturnAt: new Date("2020-01-02") }, new Date("2026-10-20"), new Date("2026-10-21"))).toBe(true);
  });
  it("does not block a returned or cancelled assignment", () => {
    for (const status of ["RETURNED", "CANCELLED"]) expect(vehicleUseOverlaps({ status, startsAt: new Date(reserve.startsAt), expectedReturnAt: new Date(reserve.expectedReturnAt) }, new Date(reserve.startsAt), new Date(reserve.expectedReturnAt))).toBe(false);
  });
});
