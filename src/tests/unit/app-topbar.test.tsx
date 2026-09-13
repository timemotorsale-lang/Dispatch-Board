import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";

let currentPathname = "/vehicles";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}));

import { AppTopbar } from "@/components/layout/app-topbar";
import { AppearanceProvider } from "@/components/layout/appearance";

const testUser: AuthenticatedUser = {
  id: "user-1",
  name: "Alex Operator",
  email: "alex@example.test",
  isActive: true,
  roles: ["General Manager"],
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
    expect(markup).toContain("Dispatch Board</span>");
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

  it("does not offer management consoles inside a non-management role workspace", () => {
    currentPathname = "/vehicles/parts-operations";

    const markup = renderToStaticMarkup(
      <AppearanceProvider>
        <AppTopbar
          commandCenterHome={false}
          onMenuOpen={() => undefined}
          showNavigationMenu
          user={{ ...testUser, roles: ["Parts"] }}
        />
      </AppearanceProvider>
    );

    expect(markup).toContain('aria-label="Parts Workspace"');
    expect(markup).not.toContain('aria-label="Open Command Control Center home"');
    expect(markup).not.toContain('href="/command-center"');
    expect(markup).not.toContain('aria-label="Open Dispatch Board console"');
    expect(markup).not.toContain('href="/board"');
  });

  it("offers a workspace switcher only to a multi-role user", () => {
    currentPathname = "/tasks";
    const markup = renderToStaticMarkup(
      <AppearanceProvider>
        <AppTopbar
          commandCenterHome={false}
          onMenuOpen={() => undefined}
          showNavigationMenu
          user={{ ...testUser, roles: ["Office Manager", "Marketing/Advertisement Manager"] }}
        />
      </AppearanceProvider>
    );

    expect(markup).toContain("Operations Coordinator");
    expect(markup).toContain('aria-haspopup="menu"');
  });

  it("provides a direct Dispatch Board switch from the Appointment Console", () => {
    currentPathname = "/appointments";

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
    expect(markup).toContain('aria-label="Open Dispatch Board console"');
    expect(markup).toContain('href="/board"');
    expect(markup).toContain("Dispatch Board</span>");
  });

  it("honors the server-validated workspace preference on a shared landing route", () => {
    currentPathname = "/my-tasks";
    const markup = renderToStaticMarkup(
      <AppearanceProvider>
        <AppTopbar
          commandCenterHome={false}
          onMenuOpen={() => undefined}
          preferredWorkspace="OFFICE"
          showNavigationMenu
          user={{ ...testUser, roles: ["Office Manager", "Marketing/Advertisement Manager"] }}
        />
      </AppearanceProvider>
    );

    expect(markup).toContain("Active workspace: Office Workspace. Switch workspace");
    expect(markup).toContain("Office Workspace");
  });

  it("shows a persistent return to Ancilla's workspace when she leaves the coordinator home", () => {
    currentPathname = "/appointments";
    const markup = renderToStaticMarkup(
      <AppearanceProvider>
        <AppTopbar
          commandCenterHome={false}
          onMenuOpen={() => undefined}
          showNavigationMenu
          user={{ ...testUser, roles: ["Office Manager", "Marketing/Advertisement Manager"] }}
        />
      </AppearanceProvider>
    );

    expect(markup).toContain('aria-label="Return to Operations Coordinator workspace"');
    expect(markup).toContain('href="/operations-coordinator"');
    expect(markup).toContain("Back to My Workspace");
  });

  it("does not show the coordinator return link while already on the coordinator home", () => {
    currentPathname = "/operations-coordinator";
    const markup = renderToStaticMarkup(
      <AppearanceProvider>
        <AppTopbar
          commandCenterHome={false}
          onMenuOpen={() => undefined}
          showNavigationMenu
          user={{ ...testUser, roles: ["Office Manager", "Marketing/Advertisement Manager"] }}
        />
      </AppearanceProvider>
    );

    expect(markup).not.toContain('aria-label="Return to Operations Coordinator workspace"');
  });
});
