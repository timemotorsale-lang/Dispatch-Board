import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {} })
}));

import { UnifiedCrmCustomerInteractionForm } from "@/features/unified-crm/unified-crm-customer-interaction-form";

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
    expect(markup).toContain("Occurred at");
    expect(markup).toContain("Record outcome");
    expect(markup).toContain("Saved here only. No message will be sent.");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Close");
  });
});
