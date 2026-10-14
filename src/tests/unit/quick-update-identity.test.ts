import { describe, expect, it } from "vitest";

import { quickUpdateMatchesContext } from "@/lib/quick-update-context-match";
import { quickUpdateIdentityKey } from "@/lib/quick-update-identity";

describe("Quick Update identity", () => {
  it("normalizes formatted phone numbers into the same durable key", () => {
    expect(quickUpdateIdentityKey("Rayaha", "(612) 555-0188", "Warranty"))
      .toBe(quickUpdateIdentityKey("Different spelling", "+1 612-555-0188", "Other"));
  });

  it("falls back to normalized person and company when no phone exists", () => {
    expect(quickUpdateIdentityKey("  Rayaha   Ali ", "", " Time Motor Sales "))
      .toBe("name:rayaha ali|company:time motor sales");
  });

  it("does not invent an identity when no identifying details exist", () => {
    expect(quickUpdateIdentityKey("", "", "Time Motor Sales")).toBe("");
  });
});

describe("Quick Update related-context matching", () => {
  const current = {
    company: "",
    identityKey: "phone:9522289267",
    person: "Shindes",
    phoneNumber: "952 228 9267",
    relatedCustomerId: null,
    text: "Shindes, Kenyan Girl, Osman's friend, returned about the 2016 Ford Fusion."
  };

  it("finds an older update when its dedicated phone field was blank but its narrative has the phone", () => {
    expect(quickUpdateMatchesContext({ ...current, text: "Customer returned about a 2016 Ford Fusion." }, {
      company: "Sales/prospect",
      identityKey: "name:kenyan girl|company:sales/prospect",
      person: "Kenyan Girl - Osman's friend",
      phoneNumber: "",
      relatedCustomerId: null,
      text: "Called about the Ford Fusion at 952 228 9267."
    })).toBe(true);
  });

  it("finds a meaningful prior name alias present in the current narrative", () => {
    expect(quickUpdateMatchesContext(current, {
      company: "Sales/prospect",
      identityKey: "name:kenyan girl|company:sales/prospect",
      person: "Kenyan Girl",
      phoneNumber: "",
      relatedCustomerId: null,
      text: "Delivery was scheduled for Friday."
    })).toBe(true);
  });

  it("does not treat an unrelated customer as history", () => {
    expect(quickUpdateMatchesContext(current, {
      company: "Warranty",
      identityKey: "phone:6125550100",
      person: "Rayaha",
      phoneNumber: "612-555-0100",
      relatedCustomerId: null,
      text: "Customer requested a warranty inspection."
    })).toBe(false);
  });
});
