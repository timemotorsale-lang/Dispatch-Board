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

  it("shows restricted visibility only when that capability is available", () => {
    const deniedMarkup = renderToStaticMarkup(<UnifiedCrmCustomerNoteForm allowRestricted={false} customerId="customer-1" />);
    const allowedMarkup = renderToStaticMarkup(<UnifiedCrmCustomerNoteForm allowRestricted={true} customerId="customer-1" defaultOpen={true} />);

    expect(deniedMarkup).not.toContain(">Restricted<");
    expect(allowedMarkup).toContain("<form");
    expect(allowedMarkup).toContain(">Restricted<");
  });

  it("builds a safe customer notes return only for real CRM customer pages", () => {
    expect(currentCustomerPageHref("/crm/customers/customer-1", "crmReturnTo=%2Fcrm%3Fview%3Dcustomers", "customer-notes-heading")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dcustomers#customer-notes-heading"
    );
    expect(currentCustomerPageHref("/customers/customer-1", "", "customer-notes-heading")).toBeNull();
  });

  it("renders a fail-closed review-only state when note commands are unavailable", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomerNoteForm
        allowRestricted={false}
        available={false}
        customerId="customer-1"
        fallbackHref="/customers/customer-1"
      />
    );

    expect(markup).toContain("Customer note entry is review only from Customer 360 right now.");
    expect(markup).toContain("Customer 360 is fail-closed for note commands right now.");
    expect(markup).toContain("Review visible notes");
    expect(markup).toContain("Open governed source workflow");
    expect(markup).toContain("No note is recorded from this surface while command entry is unavailable.");
    expect(markup).not.toContain("Add note");
    expect(markup).not.toContain("Save note");
  });
});
