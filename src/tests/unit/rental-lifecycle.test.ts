import { describe, expect, it } from "vitest";
import { rentalLifecycle, validateRentalHandover } from "@/lib/rental-lifecycle";

const now = new Date("2026-11-01T06:30:00Z");
const due = new Date("2026-11-03T06:30:00Z");
const input = { physicalHandover: true, insuranceVerified: true, insuranceValidUntil: due.toISOString(), timezone: "America/Chicago" };
const insurance = { documentType: "insurance-proof", status: "ACCEPTED", source: "MANUAL_UPLOAD", classificationSnapshot: {} };
const signed = { documentType: "signed-agreement", status: "ACCEPTED", source: "MANUAL_UPLOAD", classificationSnapshot: { signed: true } };
describe("daily rental activation and monitoring", () => {
  it("distinguishes actual custody from finalized paperwork and due dates", () => {
    expect(rentalLifecycle(null, now)).toBe("Rental Draft");
    expect(rentalLifecycle({ status: "RESERVED", expectedReturnAt: due }, now)).toBe("Ready for Checkout");
    expect(rentalLifecycle({ status: "CHECKED_OUT", expectedReturnAt: due }, now)).toBe("Rental Active");
    expect(rentalLifecycle({ status: "CHECKED_OUT", expectedReturnAt: due }, new Date(due.getTime() - 86400000))).toBe("Rental Due Soon");
    expect(rentalLifecycle({ status: "CHECKED_OUT", expectedReturnAt: due }, due)).toBe("Rental Overdue");
    expect(rentalLifecycle({ status: "RETURNED", expectedReturnAt: due }, due)).toBe("Rental Returned");
  });
  it("rejects generated, unsigned and unreviewed agreements", () => {
    for (const document of [{ ...signed, source: "GENERATED" }, { ...signed, status: "PENDING_REVIEW" }, { ...signed, classificationSnapshot: { signed: false } }]) {
      expect(() => validateRentalHandover(input, [document], now, due)).toThrow("signed rental agreement");
    }
  });
  it("requires physical handover and insurance covering the entire rental", () => {
    expect(() => validateRentalHandover({ ...input, physicalHandover: false }, [signed, insurance], now, due)).toThrow("physical handover");
    expect(() => validateRentalHandover({ ...input, insuranceVerified: false }, [signed, insurance], now, due)).toThrow("insurance");
    expect(() => validateRentalHandover({ ...input, insuranceValidUntil: now.toISOString() }, [signed, insurance], now, due)).toThrow("expected return");
    expect(() => validateRentalHandover({ ...input, timezone: "invalid" }, [signed, insurance], now, due)).toThrow("timezone");
    expect(() => validateRentalHandover(input, [signed, insurance], now, due)).not.toThrow();
  });
});
