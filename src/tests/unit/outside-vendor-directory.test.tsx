import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { OutsideVendorDirectory } from "@/features/inventory/outside-vendor-directory";

describe("outside vendor directory", () => {
  it("keeps reusable vendors in their own operating ledger workspace", () => {
    const html = renderToStaticMarkup(<OutsideVendorDirectory vendors={[{ id: "vendor-1", code: "DIEGO-AUTO-BODY", name: "Diego Auto Body", vendorType: "BODY_SHOP", contactName: "Diego", phoneNumber: "555-0199", email: null, address: "Body Shop Road", defaultLeadDays: 2, notes: null, status: "ACTIVE" }]} />);
    expect(html).toContain("Operations · Outside vendor workspace");
    expect(html).toContain("Diego Auto Body");
    expect(html).toContain("Vendor work ledger");
    expect(html).toContain("Billing and invoice control");
    expect(html).toContain("Add outside vendor");
  });
});
