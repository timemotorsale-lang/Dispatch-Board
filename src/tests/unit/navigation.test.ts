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

  it("marks prototype destinations explicitly so they are not mistaken for production workspaces", () => {
    const prototypes = linksFor(user()).filter((item) => item.badge === "Prototype");
    expect(prototypes.map((item) => item.href)).toEqual(expect.arrayContaining([
      "/tasks/intake",
      "/prototype/task-templates"
    ]));
  });
});
