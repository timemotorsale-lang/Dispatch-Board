import { describe, expect, it } from "vitest";

import { getNavigationGroups } from "@/components/layout/navigation";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function listHrefs(groups: ReturnType<typeof getNavigationGroups>) {
  return groups.flatMap((group) => group.items.map((item) => item.href));
}

describe("navigation visibility", () => {
  it("hides manager-only routes from staff users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test");

    expect(staffUser).toBeDefined();

    const hrefs = listHrefs(getNavigationGroups(staffUser!));

    expect(hrefs).not.toContain("/manager-review");
    expect(hrefs).not.toContain("/settings");
    expect(hrefs).not.toContain("/settings/team");
    expect(hrefs).toContain("/staff");
    expect(hrefs).toContain("/my-tasks");
    expect(hrefs).toContain("/projects");
  });

  it("shows manager routes for delegated and General Manager users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const generalManager = usersByEmail.get("morgan.manager@local.test");
    const delegatedManager = {
      id: "user-delegate",
      name: "Delegated Lead",
      email: "delegate@local.test",
      isActive: true,
      roles: ["Salesperson"],
      duties: {
        direct: ["Delegated manager capabilities"],
        roleDefaults: [],
        all: ["Delegated manager capabilities"]
      }
    };

    expect(generalManager).toBeDefined();

    expect(listHrefs(getNavigationGroups(generalManager!))).toEqual(
      expect.arrayContaining([
        "/manager-review",
        "/settings",
        "/settings/team",
        "/staff",
        "/projects"
      ])
    );
    expect(listHrefs(getNavigationGroups(delegatedManager))).toEqual(
      expect.arrayContaining([
        "/manager-review",
        "/settings",
        "/settings/team",
        "/staff",
        "/projects"
      ])
    );
  });
});
