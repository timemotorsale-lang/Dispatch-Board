import { describe, expect, it } from "vitest";

import { accountRefs, formatDay, formatPhone } from "@/features/collections/domain/account-ref";

describe("collections account references people use", () => {
  it("shows deal, stock and the last 6 of the VIN, never the long DealerCenter ID", () => {
    expect(accountRefs({ dealNumber: "2609", stockNumberRaw: "T1234", vin: "1fakevin000123456" })).toBe("Deal #2609 · Stock #T1234 · VIN …123456");
    expect(accountRefs({ dealNumber: "2609", stockNumberRaw: null, vin: null })).toBe("Deal #2609");
    expect(accountRefs({})).toBe("");
  });

  it("formats dates the way people read them", () => {
    expect(formatDay("2025-08-23")).toBe("Aug 23, 2025");
    expect(formatDay("2026-01-05")).toBe("Jan 5, 2026");
    expect(formatDay(null)).toBe("—");
    expect(formatDay("not a date")).toBe("not a date");
  });

  it("formats US phone numbers the way people write them", () => {
    expect(formatPhone("+16125550123")).toBe("(612) 555-0123");
    expect(formatPhone("612-555-0123")).toBe("(612) 555-0123");
    expect(formatPhone("+447700900123")).toBe("+447700900123");
    expect(formatPhone(null)).toBe("");
  });
});
