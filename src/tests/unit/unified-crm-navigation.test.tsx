import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

let currentPathname = "/crm";
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => currentSearchParams
}));

import { ConsoleSidebar } from "@/components/layout/console-sidebar";
import { getConsoleNavigation } from "@/components/layout/console-navigation";
import { getDispatchNavigationItems } from "@/components/layout/navigation";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Eli Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function titlesFor(user: AuthenticatedUser) {
  return getDispatchNavigationItems(user).map((item) => item.title);
}

describe("Unified CRM shared navigation", () => {
  beforeEach(() => {
    currentPathname = "/crm";
    currentSearchParams = new URLSearchParams();
  });

  it("discovers CRM only for coarse Management and Sales workspaces", () => {
    expect(titlesFor(manager)).toContain("CRM");
    expect(titlesFor({ ...manager, roles: ["Salesperson"] })).toContain("CRM");
    expect(titlesFor({ ...manager, roles: ["Parts"] })).not.toContain("CRM");
    expect(titlesFor({ ...manager, roles: ["Operations Coordinator"] })).not.toContain("CRM");
    expect(getConsoleNavigation("/crm", { ...manager, roles: ["Parts"] })).toBeNull();
    expect(getConsoleNavigation("/crm", { ...manager, roles: ["Operations Coordinator"] })).toBeNull();
  });

  it("keeps the independent CRM views query-addressable with Home active by default", () => {
    const console = getConsoleNavigation(currentPathname, manager);
    expect(console).not.toBeNull();

    const markup = renderToStaticMarkup(
      <ConsoleSidebar
        console={console!}
        isOpen
        onClose={() => undefined}
        user={manager}
      />
    );

    expect(markup).toContain('aria-label="Customer Operations navigation"');
    expect(markup).toContain('aria-current="page" class="sidebar-link sidebar-link-active" href="/crm"');
    expect(markup).toContain('href="/crm?view=work"');
    expect(markup).toContain('href="/crm?view=customers"');
    expect(markup).toContain('href="/crm?view=pipeline"');
    expect(markup).toContain('href="/crm?view=conversations"');
    expect(markup).toContain('href="/crm?view=insights"');
    expect(markup).toContain('href="/crm?view=more"');
  });

  it("marks exactly the requested CRM query view active", () => {
    currentSearchParams = new URLSearchParams("view=conversations");
    const console = getConsoleNavigation(currentPathname, manager);
    const markup = renderToStaticMarkup(
      <ConsoleSidebar
        console={console!}
        isOpen
        onClose={() => undefined}
        user={manager}
      />
    );

    expect(markup).toContain('aria-current="page" class="sidebar-link sidebar-link-active" href="/crm?view=conversations"');
    expect(markup).not.toContain('aria-current="page" class="sidebar-link sidebar-link-active" href="/crm"');
  });
});
