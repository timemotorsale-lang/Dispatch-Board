import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {} })
}));

import CustomerLoading from "@/app/(app)/crm/customers/[customerId]/loading";
import { UnifiedCrmCustomer360 } from "@/features/unified-crm/unified-crm-customer-360";
import { customer360Fixture } from "@/tests/unit/unified-crm-customer-360-fixture";

describe("Unified CRM Customer 360", () => {
  it("prioritizes read-only identity, next action, masked contact, provenance, and source lenses", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomer360 model={customer360Fixture()} returnHref="/crm?view=customers&amp;q=Alex" />);
    expect(markup).toContain("Alex Morgan"); expect(markup).toContain("Taylor B."); expect(markup).toContain("Next relationship action");
    expect(markup).toContain("••••1234"); expect(markup).toContain("a•••@e•••.com"); expect(markup).toContain("Current · observed");
    expect(markup).toContain("Team context"); expect(markup).toContain("Customer prefers texts after lunch.");
    expect(markup).toContain("Relationship timeline"); expect(markup).toContain("Phone Outbound"); expect(markup).toContain("Appointment confirmation was recorded.");
    expect(markup).toContain("LEAD-101"); expect(markup).toContain("CASE-202"); expect(markup).toContain("changes stay in their source");
    expect(markup).toContain("manual contact outcomes are recorded here"); expect(markup).not.toContain("Edit customer"); expect(markup).not.toContain("New task");
  });

  it("renders one non-enumerating not-available state and safe recovery", () => {
    const markup = renderToStaticMarkup(<UnifiedCrmCustomer360 failureKind="not-available" returnHref="/crm?view=customers" />);
    expect(markup).toContain("Customer isn’t available"); expect(markup).toContain("may not exist, may have changed, or may be outside");
    expect(markup).not.toContain("merged"); expect(markup).not.toContain("archived"); expect(markup).not.toContain("Alex Morgan");
    expect(markup).toContain('href="/crm?view=customers"'); expect(markup).toContain('href="/customers"');
  });

  it("provides an honest reachable loading state", () => {
    const markup = renderToStaticMarkup(<CustomerLoading />);
    expect(markup).toContain('aria-busy="true"'); expect(markup).toContain("Loading permitted customer context");
    expect(markup).toContain("No action has been completed"); expect(markup).not.toContain("Alex Morgan");
  });
});
