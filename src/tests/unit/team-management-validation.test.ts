import { describe, expect, it } from "vitest";

import {
  normalizeManagedDutyCreateInput,
  normalizeManagedRoleCreateInput,
  normalizeTeamMemberCreateInput
} from "@/server/validation/team-management";

describe("team management validation", () => {
  it("normalizes a valid team member create input", () => {
    expect(
      normalizeTeamMemberCreateInput({
        name: "  Alex Staff ",
        email: "  Alex.Staff@Local.Test ",
        password: "StrongTemp123!",
        roleIds: ["role-sales", " role-sales ", "role-admin"],
        dutyIds: ["duty-follow-up", " duty-follow-up "],
        isActive: true
      })
    ).toEqual({
      name: "Alex Staff",
      email: "alex.staff@local.test",
      password: "StrongTemp123!",
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
        password: "StrongTemp123!",
        roleIds: []
      })
    ).toThrow("At least one role must be assigned.");
  });

  it("requires a stronger temporary password", () => {
    expect(() =>
      normalizeTeamMemberCreateInput({
        name: "Alex Staff",
        email: "alex.staff@local.test",
        password: "short",
        roleIds: ["role-sales"]
      })
    ).toThrow("Temporary password must be at least 12 characters.");
  });

  it("normalizes a role with optional default duties", () => {
    expect(
      normalizeManagedRoleCreateInput({
        name: "  Finance Manager ",
        description: "  Oversees lender workflow. ",
        dutyIds: ["duty-lender", " duty-lender ", "duty-paperwork"]
      })
    ).toEqual({
      name: "Finance Manager",
      description: "Oversees lender workflow.",
      dutyIds: ["duty-lender", "duty-paperwork"]
    });
  });

  it("normalizes a duty input with workflow area", () => {
    expect(
      normalizeManagedDutyCreateInput({
        name: "  Confirm lender document package ",
        workflowArea: "sales",
        description: "  Confirm signatures before funding. "
      })
    ).toEqual({
      name: "Confirm lender document package",
      workflowArea: "SALES",
      description: "Confirm signatures before funding."
    });
  });
});
