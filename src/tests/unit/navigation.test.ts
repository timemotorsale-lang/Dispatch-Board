import { describe, expect, it } from "vitest";

import {
  getDispatchNavigationItems,
  getNavigationGroups,
  isDispatchConsolePath
} from "@/components/layout/navigation";
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
    expect(liveItems.map((item) => item.title)).toEqual(["Dispatch Board"]);
  });

  it("marks future Command Control Center modules as planned and unavailable", () => {
    const planned = linksFor(user()).filter((item) => item.disabled);

    expect(planned.map((item) => item.title)).toEqual([
      "Time & Attendance",
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
    const localItems = getDispatchNavigationItems(user());

    expect(localItems.map((item) => item.title)).toEqual([
      "Overview",
      "Live Board",
      "My Tasks",
      "Tasks",
      "Projects",
      "Appointments",
      "Vehicles",
      "Customers",
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
      "Customers",
      "Manager Review",
      "Team",
      "Activity"
    ]);
  });

  it("separates Dispatch console routes from CCC Home", () => {
    expect(isDispatchConsolePath("/board")).toBe(true);
    expect(isDispatchConsolePath("/tasks/task-1")).toBe(true);
    expect(isDispatchConsolePath("/vehicles/360/unit-1")).toBe(true);
    expect(isDispatchConsolePath("/command-center")).toBe(false);
    expect(isDispatchConsolePath("/administration")).toBe(false);
  });
});
