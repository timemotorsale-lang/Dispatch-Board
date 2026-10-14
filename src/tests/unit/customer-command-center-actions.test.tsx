import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/layout/appearance", () => ({
  useAppearance: () => ({ appearance: "light", setAppearance: vi.fn() })
}));

import { CustomerCommandCenter } from "@/features/customers/customer-command-center";

describe("Customer command center actions", () => {
  it("keeps Customer 360 quick actions in context instead of linking to risky missing routes", () => {
    const markup = renderToStaticMarkup(<CustomerCommandCenter customerId="customer-1" />);

    expect(markup).toContain("Log Call");
    expect(markup).toContain("Send Email");
    expect(markup).toContain("New Task");
    expect(markup).toContain("New Case");
    expect(markup).toContain("Schedule Appt");
    expect(markup).toContain("Upload Doc");
    expect(markup).not.toContain('href="/tasks');
    expect(markup).not.toContain('href="/appointments');
    expect(markup).not.toContain('href="/customers/resolutions?customerId=');
  });
});
