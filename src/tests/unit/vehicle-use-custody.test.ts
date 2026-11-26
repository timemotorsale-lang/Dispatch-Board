import { describe, expect, it } from "vitest";
import { describeVehicleCustodySelection, describeVehicleUseCustody } from "@/lib/vehicle-use-custody";

const now = new Date("2026-11-02T22:00:00.000Z");
function booking(status: string, pathway = "daily-rental", expectedReturnAt = new Date("2026-11-02T23:15:00.000Z")) {
  return { status, expectedReturnAt, context: { draft: { pathway } }, agreementJacket: null };
}

describe("shared vehicle custody label", () => {
  it("shows actual custody ahead of reservations and formats the due date in Chicago", () => {
    expect(describeVehicleUseCustody([booking("RESERVED"), booking("CHECKED_OUT")], now)).toEqual({ blocksTemporaryUse: true, label: "Rented Out · Due back Nov 2, 5:15 PM CST" });
  });

  it("keeps overdue loaners occupied and prefers the preserved agreement pathway", () => {
    const overdue = booking("CHECKED_OUT", "lease-to-own", new Date("2026-10-31T22:15:00.000Z"));
    expect(describeVehicleUseCustody([{ ...overdue, agreementJacket: { pathway: "vehicle-loaner" } }], now)).toEqual({ blocksTemporaryUse: true, label: "Loaner Active · Overdue since Oct 31, 5:15 PM CDT" });
  });

  it("distinguishes a returned hold from completion and ignores expired reservations", () => {
    expect(describeVehicleUseCustody([booking("RESERVED"), booking("RETURNED_REVIEW")], now)).toEqual({ blocksTemporaryUse: true, label: "Returned · inspection or settlement pending" });
    expect(describeVehicleUseCustody([booking("RETURNED"), booking("RESERVED", "daily-rental", now)], now)).toBeNull();
    expect(describeVehicleUseCustody([booking("RESERVED")], now)?.blocksTemporaryUse).toBe(false);
  });

  it("requires explicit review for an unresolved legacy return regardless of later use", () => {
    const legacy = { ...booking("RETURNED"), id: "legacy", checkedOutAt: new Date("2026-11-01T17:00:00.000Z"), events: [], agreementJacket: { pathway: "daily-rental" } };
    const later = { ...booking("RETURNED", "test-drive"), id: "test-drive", checkedOutAt: now, events: [] };
    expect(describeVehicleCustodySelection([legacy], now)?.blocksTemporaryUse).toBe(true);
    expect(describeVehicleCustodySelection([legacy, later], now)?.blocksTemporaryUse).toBe(true);
    expect(describeVehicleCustodySelection([{ ...legacy, events: [{ id: "completion" }] }], now)).toBeNull();
  });
});
