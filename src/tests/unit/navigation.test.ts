import { describe, expect, it } from "vitest";

import {
  getDispatchNavigationItems,
  getNavigationGroups,
  isDispatchConsolePath
} from "@/components/layout/navigation";
import { getConsoleNavigation } from "@/components/layout/console-navigation";
import type { AuthenticatedUser } from "@/server/auth/store";

function user(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    name: "Alex Operator",
    email: "alex@example.test",
    isActive: true,
    roles: ["Staff"],
    duties: { direct: [], roleDefaults: [], all: [] },
    ...overrides
  };
}

function linksFor(testUser: AuthenticatedUser) {
  return getNavigationGroups(testUser).flatMap((group) => group.items);
}

describe("enterprise shell navigation", () => {
  it("presents Dispatch as the only live Command Control Center module", () => {
    const links = linksFor(user());
    const dispatch = links.find((item) => item.title === "Dispatch Board");
    const liveItems = links.filter((item) => !item.disabled);

    expect(dispatch?.href).toBe("/board");
    expect(dispatch?.badge).toBe("Live");
    expect(liveItems.map((item) => item.title)).toEqual(["Dispatch Board", "Time & Attendance"]);
  });

  it("marks future Command Control Center modules as planned and unavailable", () => {
    const planned = linksFor(user()).filter((item) => item.disabled);

    expect(planned.map((item) => item.title)).toEqual([
      "People & HR",
      "Compliance",
      "Legal & Accounting",
      "Library & Training",
      "Insights"
    ]);
    expect(planned.every((item) => item.badge === "Planned")).toBe(true);
  });

  it("exposes administration and settings navigation only to managers", () => {
    const staffHrefs = linksFor(user()).map((item) => item.href);
    expect(staffHrefs).not.toContain("/administration");
    expect(staffHrefs).not.toContain("/settings");

    const manager = user({
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    });
    const managerHrefs = linksFor(manager).map((item) => item.href);
    expect(managerHrefs).toContain("/administration");
    expect(managerHrefs).toContain("/settings");
  });

  it("supports delegated manager duties without requiring a second identity", () => {
    const delegatedManager = user({
      duties: {
        direct: ["Delegated manager capabilities"],
        roleDefaults: [],
        all: ["Delegated manager capabilities"]
      }
    });

    const hrefs = linksFor(delegatedManager).map((item) => item.href);
    expect(hrefs).toContain("/administration");
  });

  it("keeps Dispatch-local destinations inside the Dispatch hierarchy", () => {
    const localItems = getDispatchNavigationItems(user({ roles: ["General Manager"] }));

    expect(localItems.map((item) => item.title)).toEqual([
      "Overview",
      "Live Board",
      "My Tasks",
      "Tasks",
      "Projects",
      "Appointments",
      "Vehicles",
      "Diagnostics",
      "Labor Guide",
      "Advisor Review",
      "Autobody Estimate",
      "Customers",
      "Sales",
      "Marketing",
      "Advertising",
      "Manager Review",
      "Team",
      "Activity"
    ]);
  });

  it("adds Manager Review in the approved position for managers only", () => {
    const manager = user({ roles: ["General Manager"] });
    const managerItems = getDispatchNavigationItems(manager);

    expect(managerItems.map((item) => item.title)).toEqual([
      "Overview",
      "Live Board",
      "My Tasks",
      "Tasks",
      "Projects",
      "Appointments",
      "Vehicles",
      "Diagnostics",
      "Labor Guide",
      "Advisor Review",
      "Autobody Estimate",
      "Customers",
      "Sales",
      "Marketing",
      "Advertising",
      "Manager Review",
      "Team",
      "Activity"
    ]);
  });

  it("reduces a mechanic-only account to the three technician destinations", () => {
    const mechanic = user({ roles: ["Mechanic"] });
    const items = getDispatchNavigationItems(mechanic);
    const repairWorkbench = getConsoleNavigation(
      "/vehicles/repair-jobs/job-1/workbench",
      mechanic
    );

    expect(items.map((item) => [item.title, item.href])).toEqual([
      ["My Work", "/my-tasks"],
      ["Available Work", "/my-tasks/available"],
      ["Diagnostics & Tools", "/diagnostics"]
    ]);
    expect(repairWorkbench?.subtitle).toBe("Technician Workspace");
    expect(repairWorkbench?.homeHref).toBe("/my-tasks");
    expect(repairWorkbench?.items.map((item) => item.title)).toEqual([
      "My Work",
      "Available Work",
      "Diagnostics & Tools"
    ]);
  });

  it("nests working Marketing and Advertising views beneath Sales", () => {
    const items = getDispatchNavigationItems(user({ roles: ["Marketing/Advertisement Manager"] }));
    const salesItems = items.filter((item) => item.href.includes("department="));

    expect(salesItems.map((item) => [item.title, item.href])).toEqual([
      ["Marketing", "/tasks?department=MARKETING"],
      ["Advertising", "/tasks?department=ADVERTISING"]
    ]);
  });

  it("nests diagnostic workflow pages beneath Diagnostics", () => {
    const diagnosticItems = getDispatchNavigationItems(user({ roles: ["General Manager"] })).filter((item) => item.title === "Diagnostics" || item.parentHref === "/diagnostics");

    expect(diagnosticItems.map((item) => [item.title, item.href])).toEqual([
      ["Diagnostics", "/diagnostics"],
      ["Labor Guide", "/diagnostics/labor-guide"],
      ["Advisor Review", "/diagnostics/advisor-review"],
      ["Autobody Estimate", "/diagnostics/autobody-estimate"]
    ]);
    expect(diagnosticItems.slice(1).every((item) => item.isNested)).toBe(true);
  });

  it("separates Dispatch console routes from CCC Home", () => {
    expect(isDispatchConsolePath("/board")).toBe(true);
    expect(isDispatchConsolePath("/tasks/task-1")).toBe(true);
    expect(isDispatchConsolePath("/vehicles/360/unit-1")).toBe(true);
    expect(isDispatchConsolePath("/command-center")).toBe(false);
    expect(isDispatchConsolePath("/administration")).toBe(false);
  });

  it("assigns each implemented console its own sidebar navigation", () => {
    const staffDispatch = getConsoleNavigation("/tasks/task-1", user());
    const inventoryConsole = getConsoleNavigation("/vehicles/parts-operations", user({ roles: ["General Manager"] }));
    const manager = user({ roles: ["General Manager"] });
    const managerAdministration = getConsoleNavigation("/settings/team", manager);

    expect(staffDispatch?.subtitle).toBe("My Work");
    expect(staffDispatch?.homeHref).toBe("/my-tasks");
    expect(staffDispatch?.items.map((item) => item.title)).toEqual([
      "My Work",
      "Tasks",
    ]);
    expect(managerAdministration?.subtitle).toBe("Administration Console");
    expect(managerAdministration?.items.map((item) => item.title)).toEqual([
      "Administration",
      "Integrations",
      "Settings"
    ]);
    expect(inventoryConsole?.title).toBe("Inventory Console");
    expect(inventoryConsole?.items.map((item) => item.title)).toEqual([
      "Home",
      "Inventory Lifecycle",
      "Shop & Recon",
      "Repair Workbench",
      "Reviews",
      "Approvals",
      "Reports",
      "Administration"
    ]);
    expect(inventoryConsole?.items.find((item) => item.title === "Shop & Recon")?.href).toBe("/vehicles/shop-recon");
    expect(inventoryConsole?.items.find((item) => item.title === "Repair Workbench")?.href).toBe("/vehicles/repair-workbench");
    expect(getConsoleNavigation("/command-center", manager)).toBeNull();
  });

  it("gives each operating role a focused navigation shell", () => {
    expect(getConsoleNavigation("/vehicles", user({ roles: ["Vehicle Operations Lead"] }))?.items.map((item) => item.title)).toEqual([
      "Operations Home",
      "My Vehicle Work",
      "Inventory Flow",
      "Shop & Recon",
      "Parts Runner",
      "Receive Vehicle",
      "Exceptions"
    ]);
    expect(getConsoleNavigation("/vehicles/shop-recon", user({ roles: ["Service Department Manager"] }))?.items.map((item) => item.title)).toEqual([
      "Shop & Recon",
      "Repair Orders",
      "Shop Dispatch",
      "Parts Operations",
      "Quality Control",
      "Reviews"
    ]);
    expect(getConsoleNavigation("/vehicles", user({ roles: ["Inventory Manager"] }))?.items.map((item) => item.title)).toEqual([
      "Inventory Home",
      "Inventory Lifecycle",
      "Shop & Recon",
      "Parts Readiness",
      "Reviews"
    ]);
    expect(getConsoleNavigation("/appointments", user({ roles: ["Service Advisor"] }))?.items.map((item) => item.title)).toEqual([
      "Advisor Home",
      "Check In Vehicle",
      "Appointment Board",
      "Customers",
      "Repair Orders",
      "Diagnostic Review",
      "My Work"
    ]);
    expect(getConsoleNavigation("/vehicles/parts-operations", user({ roles: ["Parts"] }))?.items.map((item) => item.title)).toEqual([
      "Parts Operations",
      "Parts Counter",
      "Waiting Work",
      "My Work"
    ]);
    expect(getConsoleNavigation("/vehicles/quality-control", user({ roles: ["Quality Control"] }))?.items.map((item) => item.title)).toEqual([
      "QC Queue",
      "My Work",
      "Repair Orders"
    ]);
    expect(getConsoleNavigation("/tasks", user({ roles: ["Salesperson"] }))?.items.map((item) => item.title)).toEqual([
      "My Work",
      "Sales Tasks",
      "Appointments",
      "Customers",
      "Vehicles"
    ]);
    expect(getConsoleNavigation("/tasks", user({ roles: ["Marketing/Advertisement Manager"] }))?.items.map((item) => item.title)).toEqual([
      "My Work",
      "Marketing",
      "Advertising",
      "Vehicles"
    ]);
    expect(getConsoleNavigation("/my-tasks", user({ roles: ["Office Manager"] }))?.items.map((item) => item.title)).toEqual([
      "My Work",
      "Appointments",
      "Customers",
      "Team Tasks"
    ]);
    expect(getConsoleNavigation("/my-tasks", user({ roles: ["Collections"] }))?.items.map((item) => item.title)).toEqual([
      "My Collections",
      "Collections Queue",
      "Account Context"
    ]);
  });
});
