import { describe, expect, it } from "vitest";

import {
  canManageAssignments,
  canManageBoardGeneration,
  canManageDuties,
  canManageRoles,
  canManageSettings,
  canManageTaskTemplates,
  canManageUsers,
  canReviewWorkflows,
  canUpdateAssignedWork,
  canUseStaffSelfService,
  canViewFullBoard,
  isManager
} from "@/server/policies/access";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("permission policies", () => {
  it("allows manager-only actions for manager users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;

    expect(isManager(manager)).toBe(true);
    expect(canManageUsers(manager)).toBe(true);
    expect(canManageRoles(manager)).toBe(true);
    expect(canManageDuties(manager)).toBe(true);
    expect(canManageAssignments(manager)).toBe(true);
    expect(canManageBoardGeneration(manager)).toBe(true);
    expect(canManageSettings(manager)).toBe(true);
    expect(canManageTaskTemplates(manager)).toBe(true);
    expect(canReviewWorkflows(manager)).toBe(true);
  });

  it("rejects manager-only actions for staff users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    expect(isManager(staffUser)).toBe(false);
    expect(canManageUsers(staffUser)).toBe(false);
    expect(canManageRoles(staffUser)).toBe(false);
    expect(canManageDuties(staffUser)).toBe(false);
    expect(canManageAssignments(staffUser)).toBe(false);
    expect(canManageBoardGeneration(staffUser)).toBe(false);
    expect(canManageSettings(staffUser)).toBe(false);
    expect(canManageTaskTemplates(staffUser)).toBe(false);
    expect(canReviewWorkflows(staffUser)).toBe(false);
  });

  it("allows staff self-service checks for their own work", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    expect(staffUser).not.toBeNull();
    expect(canUseStaffSelfService(staffUser, staffUser!.id)).toBe(true);
    expect(
      canUpdateAssignedWork({
        actor: staffUser,
        assignedUserId: staffUser!.id,
        requiresManagerApproval: false,
        requestedAction: "status"
      })
    ).toBe(true);
  });

  it("rejects staff self-service checks for another user's work", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const otherStaffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;

    expect(staffUser).not.toBeNull();
    expect(otherStaffUser).not.toBeNull();
    expect(canUseStaffSelfService(staffUser, otherStaffUser!.id)).toBe(false);
    expect(
      canUpdateAssignedWork({
        actor: staffUser,
        assignedUserId: otherStaffUser!.id,
        requiresManagerApproval: false,
        requestedAction: "status"
      })
    ).toBe(false);
  });

  it("allows any authenticated user to view the full board", async () => {
    const { usersByEmail } = await createTestAuthStore();

    expect(canViewFullBoard(usersByEmail.get("jordan.sales@local.test") ?? null)).toBe(true);
    expect(canViewFullBoard(null)).toBe(false);
  });
});
