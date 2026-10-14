import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/crm/customers/customer-1",
  useRouter: () => ({ refresh() {} }),
  useSearchParams: () => new URLSearchParams("crmReturnTo=%2Fcrm%3Fview%3Dwork")
}));

import { UnifiedCrmCustomerInteractionForm } from "@/features/unified-crm/unified-crm-customer-interaction-form";
import { currentCustomerPageHref } from "@/features/unified-crm/unified-crm-customer-page-context";

describe("Unified CRM customer interaction form", () => {
  it("renders honest non-sending language and accessible disclosure controls", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerInteractionForm customerId="customer-1" />);

    expect(markup).toContain("Manual contact outcome");
    expect(markup).toContain("Record a relationship touchpoint");
    expect(markup).toContain("It does not send email, text, or other messages");
    expect(markup).toContain("source-owned workflows remain authoritative");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Log outcome");
    expect(markup).not.toContain("<form");
  });

  it("renders an open, keyboard-friendly form with honest save-only guidance", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomerInteractionForm customerId="customer-1" defaultOpen />);

    expect(markup).toContain("<form");
    expect(markup).toContain("Record only what happened and the next follow-up if one was agreed.");
    expect(markup).toContain("This form does not contact the customer.");
    expect(markup).toContain("<fieldset");
    expect(markup).toContain("Consent state");
    expect(markup).toContain("Manual text / SMS");
    expect(markup).toContain("Manual email");
    expect(markup).toContain("Internal note");
    expect(markup).toContain("Occurred at");
    expect(markup).toContain("Mark current follow-up complete");
    expect(markup).toContain("Report-worthy");
    expect(markup).toContain("Record outcome");
    expect(markup).toContain("Saved here only. No message will be sent.");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Close");
  });

  it("builds a safe customer timeline return only from a real customer page", () => {
    expect(currentCustomerPageHref("/crm/customers/customer-1", "crmReturnTo=%2Fcrm%3Fview%3Dwork", "timeline-heading")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork#timeline-heading"
    );
    expect(currentCustomerPageHref("/crm?view=work", "", "timeline-heading")).toBeNull();
  });

  it("renders a fail-closed review-only state when interaction commands are unavailable", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomerInteractionForm
        available={false}
        customerId="customer-1"
        fallbackHref="/customers/customer-1"
      />
    );

    expect(markup).toContain("Manual outcome recording is review only from Customer 360 right now.");
    expect(markup).toContain("Customer 360 is fail-closed for manual interaction commands right now.");
    expect(markup).toContain("Review timeline");
    expect(markup).toContain("Open governed source workflow");
    expect(markup).toContain("No customer message is sent here, and no manual outcome is recorded from this surface while the command is unavailable.");
    expect(markup).not.toContain("Log outcome");
    expect(markup).not.toContain("<form");
  });
});
