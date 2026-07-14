import { describe, expect, it } from "vitest";

import { getNavigationGroups } from "@/components/layout/navigation";
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
  it("keeps the core daily operations reachable from the shared shell", () => {
    const hrefs = linksFor(user()).map((item) => item.href);

    expect(hrefs).toEqual(expect.arrayContaining([
      "/board",
      "/my-tasks",
      "/tasks",
      "/vehicles",
      "/customers",
      "/customers/customer-360",
      "/appointments",
      "/activity",
      "/insights",
      "/integrations",
      "/ui-reference",
      "/inventory-manager",
      "/vehicles/inventory",
      "/vehicles/shop-dispatch",
      "/vehicles/parts-counter"
    ]));
  });

  it("exposes manager command and administration navigation only to managers", () => {
    const staffHrefs = linksFor(user()).map((item) => item.href);
    expect(staffHrefs).not.toContain("/manager-review");
    expect(staffHrefs).not.toContain("/administration");
    expect(staffHrefs).not.toContain("/settings");

    const manager = user({
      roles: ["General Manager"],
      duties: { direct: [], roleDefaults: [], all: [] }
    });
    const managerHrefs = linksFor(manager).map((item) => item.href);
    expect(managerHrefs).toContain("/manager-review");
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
    expect(hrefs).toContain("/manager-review");
    expect(hrefs).toContain("/administration");
  });

  it("adopts the approved task mockups into the shared workspace shell", () => {
    const taskIntake = linksFor(user()).find((item) => item.href === "/tasks/intake");
    const templates = linksFor(user()).find((item) => item.href === "/prototype/task-templates");
    expect(taskIntake?.badge).toBe("Workspace");
    expect(templates?.badge).toBe("Preview");
  });
});
