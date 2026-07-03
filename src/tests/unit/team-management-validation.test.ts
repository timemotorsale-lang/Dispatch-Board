import { describe, expect, it } from "vitest";

import { normalizeTeamMemberCreateInput } from "@/server/validation/team-management";

describe("team management validation", () => {
  it("normalizes a valid team member create input", () => {
    expect(
      normalizeTeamMemberCreateInput({
        name: "  Alex Staff ",
        email: "  Alex.Staff@Local.Test ",
        password: "dispatch123!",
        roleIds: ["role-sales", " role-sales ", "role-admin"],
        dutyIds: ["duty-follow-up", " duty-follow-up "],
        isActive: true
      })
    ).toEqual({
      name: "Alex Staff",
      email: "alex.staff@local.test",
      password: "dispatch123!",
      roleIds: ["role-sales", "role-admin"],
      dutyIds: ["duty-follow-up"],
      isActive: true
    });
  });

  it("requires at least one assigned role", () => {
    expect(() =>
      normalizeTeamMemberCreateInput({
        name: "Alex Staff",
        email: "alex.staff@local.test",
        password: "dispatch123!",
        roleIds: []
      })
    ).toThrow("At least one role must be assigned.");
  });

  it("requires a minimum password length", () => {
    expect(() =>
      normalizeTeamMemberCreateInput({
        name: "Alex Staff",
        email: "alex.staff@local.test",
        password: "short",
        roleIds: ["role-sales"]
      })
    ).toThrow("Temporary password must be at least 8 characters.");
  });
});
