import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/crm/customers/customer-1",
  useRouter: () => ({ refresh() {} }),
  useSearchParams: () => new URLSearchParams("crmReturnTo=%2Fcrm%3Fview%3Dwork")
}));

import { UnifiedCrmCustomerNextActionForm } from "@/features/unified-crm/unified-crm-customer-next-action-form";
import { currentCustomerPageHref } from "@/features/unified-crm/unified-crm-customer-page-context";

describe("Unified CRM customer next-action form", () => {
  it("renders live next-action guidance without overstating source ownership", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomerNextActionForm
        currentNextActionAt="2026-08-15T16:00:00.000Z"
        currentNextActionState="SCHEDULED"
        customerId="customer-1"
      />
    );

    expect(markup).toContain("Keep the customer follow-up current");
    expect(markup).toContain("Set, renew, or complete the dated CRM follow-up without leaving Customer 360.");
    expect(markup).toContain("Reschedule next action");
    expect(markup).toContain("Complete next action");
  });

  it("builds a safe customer timeline return only from a real customer page", () => {
    expect(currentCustomerPageHref("/crm/customers/customer-1", "crmReturnTo=%2Fcrm%3Fview%3Dwork", "timeline-heading")).toBe(
      "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork#timeline-heading"
    );
    expect(currentCustomerPageHref("/crm/opportunities/oppty-1", "", "timeline-heading")).toBeNull();
  });
});
