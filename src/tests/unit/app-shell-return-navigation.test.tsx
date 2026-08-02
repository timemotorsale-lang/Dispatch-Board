import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

let currentPathname = "/customers/customer-360";
let currentSearchParams = new URLSearchParams("returnTo=/sales");

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => currentSearchParams
}));

import { AppShell } from "@/components/layout/app-shell";

const testUser: AuthenticatedUser = {
  id: "user-1",
  name: "Eli Manager",
  email: "eli@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

describe("application shell Sales Console return navigation", () => {
  beforeEach(() => {
    currentPathname = "/customers/customer-360";
    currentSearchParams = new URLSearchParams("returnTo=/sales");
  });

  it("shows a return path when a source console was opened from Sales Console", () => {
    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Customer 360 source record</section>
      </AppShell>
    );

    expect(markup).toContain('aria-label="Return navigation"');
    expect(markup).toContain('href="/sales"');
    expect(markup).toContain("Return to Sales Console");
    expect(markup).toContain("Opened from Sales Console");
  });

  it("does not show the return banner while already inside Sales Console", () => {
    currentPathname = "/sales";
    currentSearchParams = new URLSearchParams("returnTo=/sales");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Sales Console</section>
      </AppShell>
    );

    expect(markup).not.toContain("Return to Sales Console");
  });

  it("rejects unsafe return paths", () => {
    currentSearchParams = new URLSearchParams("returnTo=//evil.example");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Customer 360 source record</section>
      </AppShell>
    );

    expect(markup).not.toContain("Return to Sales Console");
  });

  it("wires shared page tabs into the Inventory Console shell", () => {
    currentPathname = "/vehicles/360/vehicle-1";
    currentSearchParams = new URLSearchParams("returnTo=%2Fvehicles%2Fvehicle-1%2Finventory-planning");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Vehicle 360</section>
      </AppShell>
    );

    expect(markup).toContain('aria-label="Inventory Console page navigation"');
    expect(markup).toContain("Inventory Lifecycle");
    expect(markup).toContain("Vehicle 360");
    expect(markup).toContain("Inventory Planning");
  });
});
