import { describe, expect, it } from "vitest";

import { customerContactValue } from "@/lib/customer-contact-prefill";

describe("customer contact prefill", () => {
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
