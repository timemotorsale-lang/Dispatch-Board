import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/layout/appearance", () => ({
  useAppearance: () => ({ appearance: "light", setAppearance: vi.fn() })
}));

import { CustomerConsoleHome } from "@/features/customers/customer-console-home";

describe("Customer console home actions", () => {
  it("keeps quick actions guarded instead of exposing CRM-gated routes that can 404", () => {
    const markup = renderToStaticMarkup(<CustomerConsoleHome />);

    expect(markup).toContain("Add Lead");
    expect(markup).toContain("Add Customer");
    expect(markup).toContain("Schedule Appointment");
    expect(markup).toContain("Add Deal");
    expect(markup).toContain("Add Vehicle");
    expect(markup).toContain("Send Message");
    expect(markup).not.toContain('href="/crm');
    expect(markup).not.toContain("/tasks?source=customers");
    expect(markup).not.toContain("/vehicles/workflows/add-vehicle");
    expect(markup).toContain('type="button"');
    expect(markup).toContain('href="/customers/customer-360"');
  });
});
