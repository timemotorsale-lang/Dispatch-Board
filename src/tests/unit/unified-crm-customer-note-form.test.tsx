import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/crm/customers/customer-1",
  useRouter: () => ({
    refresh: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams("crmReturnTo=%2Fcrm%3Fview%3Dcustomers")
}));

import { UnifiedCrmCustomerNoteForm } from "@/features/unified-crm/unified-crm-customer-note-form";
import { currentCustomerPageHref } from "@/features/unified-crm/unified-crm-customer-page-context";

describe("Unified CRM customer note form", () => {
  it("renders the honest note-only language in the default closed state", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerNoteForm allowRestricted={false} customerId="customer-1" />);

    expect(markup).toContain("Add an internal customer note");
    expect(markup).toContain("It does not notify the customer");
    expect(markup).toContain("share outside the permitted team");
    expect(markup).toContain("Add note");
    expect(markup).toContain("aria-expanded=\"false\"");
    expect(markup).not.toContain("Save note");
  });

  it("builds a safe customer notes return only for real CRM customer pages", () => {
    expect(currentCustomerPageHref("/crm/customers/customer-1", "crmReturnTo=%2Fcrm%3Fview%3Dcustomers", "customer-notes-heading")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers#customer-notes-heading"
    );
    expect(currentCustomerPageHref("/customers/customer-1", "", "customer-notes-heading")).toBeNull();
  });
});
