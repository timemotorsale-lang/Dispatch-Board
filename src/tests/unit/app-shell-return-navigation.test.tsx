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

import { AppShell, isTasksSidebarCompact } from "@/components/layout/app-shell";

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

  it("keeps distinct Standard, Compact, and Focus navigation behavior for Tasks", () => {
    expect(isTasksSidebarCompact("/tasks", "standard")).toBe(false);
    expect(isTasksSidebarCompact("/tasks", "compact")).toBe(true);
    expect(isTasksSidebarCompact("/tasks", "focus")).toBe(true);
    expect(isTasksSidebarCompact("/manager-workspace", "compact")).toBe(false);
  });

  it("mounts the management sidebar on every Manager Workspace mode", () => {
    currentPathname = "/manager-workspace";
    currentSearchParams = new URLSearchParams("mode=coo");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Manager Workspace COO landing</section>
      </AppShell>
    );

    expect(markup).toContain('class="app-frame app-frame-console app-frame-console-sidebar"');
    expect(markup).toContain('aria-label="Time Motor Sales Manager Workspace"');
    expect(markup).toContain('aria-label="Manager workspace views"');
    expect(markup).toContain('href="/manager-workspace?mode=ceo"');
    expect(markup).toContain('href="/manager-workspace?mode=coo"');
    expect(markup).toContain('href="/manager-workspace?mode=work"');
    expect(markup).toContain('aria-label="Manager page sections"');
    expect(markup).toContain("Priority Intervention");
    expect(markup).toContain("Operating Pulse");
    expect(markup).toContain("Intervention Queue");
    expect(markup).toContain("Operations Inbox");
    expect(markup).not.toContain("Executive Decisions");
    expect(markup).not.toContain("My Action Queue");
    expect(markup).not.toContain('aria-label="Time Motor Sales Command Control Center"');
  });

  it("changes contextual sidebar links with each Manager Workspace mode", () => {
    currentPathname = "/manager-workspace";
    currentSearchParams = new URLSearchParams("mode=work");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Manager Workspace My Work landing</section>
      </AppShell>
    );

    expect(markup).toContain("Do This Next");
    expect(markup).toContain("My Workload");
    expect(markup).toContain("My Action Queue");
    expect(markup).toContain("My Inbox");
    expect(markup).not.toContain("Priority Intervention");
    expect(markup).not.toContain("Executive Decisions");
  });

  it("shows executive-only page links in CEO mode", () => {
    currentPathname = "/manager-workspace";
    currentSearchParams = new URLSearchParams("mode=ceo");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Manager Workspace CEO landing</section>
      </AppShell>
    );

    expect(markup).toContain("Highest-Value Decision");
    expect(markup).toContain("Business Health");
    expect(markup).toContain("Executive Decisions");
    expect(markup).toContain("Executive Inbox");
    expect(markup).not.toContain("Intervention Queue");
    expect(markup).not.toContain("My Action Queue");
  });

  it("keeps task navigation available without a duplicate page header", () => {
    currentPathname = "/tasks";
    currentSearchParams = new URLSearchParams("queue=ALL");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Tasks console</section>
      </AppShell>
    );

    expect(markup).toContain("app-frame-console-sidebar");
    expect(markup).not.toContain("app-frame-sidebar-compact");
    expect(markup).not.toContain("app-sidebar-open");
    expect(markup).not.toContain("dispatch-console-header");
    expect(markup).toContain('aria-label="Open navigation"');
    expect(markup).toContain('aria-label="Time Motor Sales Tasks Workspace"');
    expect(markup).toContain('aria-label="Task work views"');
    expect(markup).toContain('aria-label="Task status views"');
    expect(markup).toContain("Team Queue");
    expect(markup).toContain("My Tasks");
    expect(markup).toContain("Available Work");
    expect(markup).toContain("Assignment Requests");
    expect(markup).toContain("Ready for Review");
    expect(markup).not.toContain('aria-label="Time Motor Sales Command Control Center"');
    expect(markup).not.toContain('aria-label="Dispatch Board navigation"');
  });

  it("keeps the Service Advisor sidebar on a manager-contained advisor workspace", () => {
    currentPathname = "/appointments";
    currentSearchParams = new URLSearchParams("workspaceContext=MANAGEMENT&managerMode=WORK&launch=advisor&returnTo=%2Fmanager-workspace%3Fmode%3Dwork");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Service Advisor workspace</section>
      </AppShell>
    );

    expect(markup).toContain("app-frame-console-sidebar");
    expect(markup).toContain('aria-label="Advisor Workspace navigation"');
    expect(markup).toContain("Advisor Home");
    expect(markup).toContain("workspaceContext=MANAGEMENT");
    expect(markup).toContain("managerMode=WORK");
    expect(markup).toContain("launch=advisor");
    expect(markup).not.toContain('aria-label="Scheduling &amp; Capacity navigation"');
  });

  it("keeps the Inventory sidebar on a manager-contained inventory workspace", () => {
    currentPathname = "/vehicles";
    currentSearchParams = new URLSearchParams("workspace=inventory&workspaceContext=MANAGEMENT&managerMode=COO&returnTo=%2Fmanager-workspace%3Fmode%3Dcoo");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Inventory Manager workspace</section>
      </AppShell>
    );

    expect(markup).toContain("app-frame-console-sidebar");
    expect(markup).toContain('aria-label="Inventory Operations navigation"');
    expect(markup).toContain("Inventory Lifecycle");
    expect(markup).toContain("managerMode=COO");
  });

  it("keeps the Service Operations sidebar throughout manager-contained recon and repair work", () => {
    currentPathname = "/vehicles/shop-recon/repair-order-1";
    currentSearchParams = new URLSearchParams("workspaceContext=MANAGEMENT&managerMode=WORK&returnTo=%2Fmanager-workspace%3Fmode%3Dwork");

    const markup = renderToStaticMarkup(
      <AppShell user={testUser}>
        <section>Shop and Recon vehicle workspace</section>
      </AppShell>
    );

    expect(markup).toContain("app-frame-console-sidebar");
    expect(markup).toContain('aria-label="Service Operations navigation"');
    expect(markup).toContain("Recon / Repair Advisor");
    expect(markup).toContain("Shop Dispatch");
    expect(markup).toContain("managerMode=WORK");
  });
});
