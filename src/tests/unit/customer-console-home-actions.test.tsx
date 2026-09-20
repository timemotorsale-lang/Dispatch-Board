import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/layout/appearance", () => ({
  useAppearance: () => ({ appearance: "light", setAppearance: vi.fn() })
}));

import { CustomerConsoleHome } from "@/features/customers/customer-console-home";
import { CRM_NEXT_LEAD_SOURCE_REPORT_HREF } from "@/features/crm/crm-route-authority";

describe("Customer console home actions", () => {
  it("keeps quick actions guarded and sends default customer routes into CRM Next", () => {
    const markup = renderToStaticMarkup(<CustomerConsoleHome />);

    expect(markup).toContain("Add Lead");
    expect(markup).toContain("Add Customer");
    expect(markup).toContain("Schedule Appointment");
    expect(markup).toContain("Add Deal");
    expect(markup).toContain("Add Vehicle");
    expect(markup).toContain("Send Message");
    expect(markup).toContain('href="/crm-next/customers"');
    expect(markup).toContain('href="/crm-next/reports/lead-sources"');
    expect(markup).toContain('placeholder="Search customers, leads, vehicles, deals..."');
    expect(CRM_NEXT_LEAD_SOURCE_REPORT_HREF).toBe("/crm-next/reports/lead-sources");
    expect(markup).not.toContain("/tasks?source=customers");
    expect(markup).not.toContain("/vehicles/workflows/add-vehicle");
    expect(markup).not.toContain('href="/customers/customer-360"');
    expect(markup).toContain('type="button"');
  });
});
