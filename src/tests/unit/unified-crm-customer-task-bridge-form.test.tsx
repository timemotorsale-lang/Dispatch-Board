import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {} })
}));

import { UnifiedCrmCustomerTaskBridgeForm } from "@/features/unified-crm/unified-crm-customer-task-bridge-form";

describe("Unified CRM customer task bridge form", () => {
  it("renders the available handoff surface without changing task source ownership claims", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomerTaskBridgeForm
        customerDisplayName="Alex Morgan"
        customerId="customer-1"
        defaultDueAt="2026-08-15T16:00:00.000Z"
      />
    );

    expect(markup).toContain("Create a protected follow-up task");
    expect(markup).toContain("This creates a real task in the existing task workflow with CRM customer context.");
    expect(markup).toContain("task ownership stays with the task workspace after handoff");
    expect(markup).toContain("Create governed task");
  });

  it("renders an honest fail-closed fallback when governed handoff is unavailable", () => {
    const markup = renderToStaticMarkup(
      <UnifiedCrmCustomerTaskBridgeForm
        available={false}
        customerDisplayName="Alex Morgan"
        customerId="customer-1"
        defaultDueAt="2026-08-15T16:00:00.000Z"
        fallbackHref="/my-tasks/new?crmDraft=customer-1"
      />
    );

    expect(markup).toContain("CRM task handoff is fail-closed for this customer or environment right now.");
    expect(markup).toContain("Open existing task intake");
    expect(markup).toContain("No customer message is sent here");
    expect(markup).toContain("Customer 360 does not become the task source of truth.");
    expect(markup).not.toContain("Create governed task</button>");
    expect(markup).toContain('href="/my-tasks/new?crmDraft=customer-1"');
  });
});
