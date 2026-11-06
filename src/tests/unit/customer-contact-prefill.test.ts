import { describe, expect, it } from "vitest";

import { customerContactValue, prefillCustomerContact } from "@/lib/customer-contact-prefill";

describe("customer contact prefill", () => {
  it("repairs masked draft contacts when authorized details arrive, preserving staff overrides", () => {
    expect(prefillCustomerContact("••••7101", "+16125550100")).toBe("+16125550100");
    expect(prefillCustomerContact("a•••@•••", "buyer@example.test")).toBe("buyer@example.test");
    expect(prefillCustomerContact("6125550199", "6125550100")).toBe("6125550199");
    expect(prefillCustomerContact("staff@example.test", "buyer@example.test")).toBe("staff@example.test");
    expect(prefillCustomerContact("••••7101", "••••7101")).toBe("");
  });
  it("reads the scoped endpoint's primary public phone/email contacts", () => {
    const read = { contacts: [{ type: "PHONE", value: "••••0100" }, { type: "PHONE", value: "6125550100" }, { type: "EMAIL", value: "buyer@example.test" }] };
    expect(customerContactValue(read, "PHONE")).toBe("6125550100");
    expect(customerContactValue(read, "EMAIL")).toBe("buyer@example.test");
  });
  it("uses an authorized primary contact point before a legacy contact field", () => {
    const read = {
      customer: { phone: "612-555-0000" },
      panel: { items: [
        { title: "PHONE", detail: "612-555-1111", meta: "Alternate" },
        { title: "PHONE", detail: "612-555-2222", meta: "Primary" }
      ] }
    };
    expect(customerContactValue(read, "PHONE")).toBe("612-555-2222");
  });

  it("never prefills restricted contact data", () => {
    expect(customerContactValue({ customer: { email: "Restricted" }, panel: { items: [{ title: "EMAIL", detail: "Restricted", meta: "Primary" }] } }, "EMAIL")).toBe("");
    expect(customerContactValue({ customer: { email: "buyer@example.com" } }, "EMAIL")).toBe("buyer@example.com");
  });
});
