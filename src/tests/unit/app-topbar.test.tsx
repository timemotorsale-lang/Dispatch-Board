import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

let currentPathname = "/vehicles";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams()
}));

import { AppTopbar } from "@/components/layout/app-topbar";
import { AppearanceProvider } from "@/components/layout/appearance";

const testUser: AuthenticatedUser = {
  id: "user-1",
  name: "Alex Operator",
  email: "alex@example.test",
  isActive: true,
  roles: ["Staff"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

describe("application top bar console switching", () => {
  beforeEach(() => {
    currentPathname = "/vehicles";
  });

  it("provides direct CCC Home and Dispatch switches from the Inventory console", () => {
    const markup = renderToStaticMarkup(
      <AppearanceProvider>
        <AppTopbar
          commandCenterHome={false}
          onMenuOpen={() => undefined}
          showNavigationMenu
          user={testUser}
        />
      </AppearanceProvider>
    );

    expect(markup).toContain('aria-label="Command Center Home"');
    expect(markup).toContain('href="/command-center"');
    expect(markup).toContain('aria-label="Open Dispatch Board console"');
    expect(markup).toContain('href="/board"');
    expect(markup).toContain("Dispatch</span>");
    expect(markup).toContain('aria-label="Application appearance"');
    expect(markup).toContain('aria-label="Use light appearance"');
    expect(markup).toContain('aria-label="Use dark appearance"');
  });

  it("does not duplicate the Dispatch switch inside the active Dispatch console", () => {
    currentPathname = "/tasks";

    const markup = renderToStaticMarkup(
      <AppearanceProvider>
        <AppTopbar
          commandCenterHome={false}
          onMenuOpen={() => undefined}
          showNavigationMenu
          user={testUser}
        />
      </AppearanceProvider>
    );

    expect(markup).not.toContain('aria-label="Open Dispatch Board console"');
  });
});
