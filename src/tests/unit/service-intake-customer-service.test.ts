import { describe, expect, it } from "vitest";

import { normalizeServiceIntakePhoneNumber } from "@/server/service-intake/customer-service";

describe("service intake customer service", () => {
  it("normalizes common US phone formatting to the customer database format", () => {
    expect(normalizeServiceIntakePhoneNumber("612 342 5656")).toBe("+16123425656");
    expect(normalizeServiceIntakePhoneNumber("(612) 342-5656")).toBe("+16123425656");
    expect(normalizeServiceIntakePhoneNumber("1-612-342-5656")).toBe("+16123425656");
  });

  it("rejects unusable phone numbers before they reach the database", () => {
    expect(() => normalizeServiceIntakePhoneNumber("123")).toThrow("valid mobile number");
  });
});
