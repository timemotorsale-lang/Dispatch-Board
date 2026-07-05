import { describe, expect, it } from "vitest";

import {
  assertAuthenticatedUser,
  canApproveAppointment,
  canCreateAppointment,
  canManageAppointmentConfiguration,
  canManageAssignments,
  canManageBoardGeneration,
  canManageDuties,
  canGrantManagerPowers,
  canManageRoles,
  canManageSettings,
  canManageTaskTemplates,
  canManageUsers,
  canMutateAppointment,
  canOverrideAppointmentWarning,
  canCommentOnTask,
  canReviewWorkflows,
  canUpdateAssignedWork,
  canUseStaffSelfService,
  canViewAppointmentLimitedData,
  canViewAppointmentSchedule,
  canViewFullBoard,
  canTransferAppointmentOwnership,
  isManager
} from "@/server/policies/access";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("permission policies", () => {
  it("throws a consistent authentication error when a user is required", () => {
    expect(() => assertAuthenticatedUser(null)).toThrow("Authentication required.");
  });

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
    expect(canManageAppointmentConfiguration(manager)).toBe(true);
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
    expect(canManageAppointmentConfiguration(staffUser)).toBe(false);
    expect(canReviewWorkflows(staffUser)).toBe(false);
    expect(canCommentOnTask(staffUser)).toBe(true);
  });

  it("does not treat manager-titled staff roles as full app managers unless they are the General Manager", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const inventoryLead = usersByEmail.get("riley.inventory@local.test") ?? null;
    const opsLead = usersByEmail.get("avery.ops@local.test") ?? null;
    const otherStaffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;

    expect(inventoryLead).not.toBeNull();
    expect(opsLead).not.toBeNull();
    expect(otherStaffUser).not.toBeNull();

    expect(isManager(inventoryLead)).toBe(false);
    expect(isManager(opsLead)).toBe(false);
    expect(canManageUsers(inventoryLead)).toBe(false);
    expect(canManageRoles(opsLead)).toBe(false);
    expect(canManageDuties(opsLead)).toBe(false);
    expect(canManageAssignments(inventoryLead)).toBe(false);
    expect(canManageSettings(opsLead)).toBe(false);
    expect(canManageBoardGeneration(inventoryLead)).toBe(false);
    expect(canManageTaskTemplates(opsLead)).toBe(false);
    expect(canManageAppointmentConfiguration(opsLead)).toBe(false);
    expect(canReviewWorkflows(inventoryLead)).toBe(false);
    expect(canCommentOnTask(inventoryLead)).toBe(true);
    expect(
      canUpdateAssignedWork({
        actor: inventoryLead,
        assignedUserId: otherStaffUser!.id,
        requiresManagerApproval: false,
        requestedAction: "reassign"
      })
    ).toBe(false);
  });

  it("allows delegated manager capabilities without making delegation assignable by non-General-Manager users", async () => {
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

    expect(isManager(delegatedManager)).toBe(true);
    expect(canManageUsers(delegatedManager)).toBe(true);
    expect(canManageAssignments(delegatedManager)).toBe(true);
    expect(canManageSettings(delegatedManager)).toBe(true);
    expect(canGrantManagerPowers(delegatedManager)).toBe(false);
    expect(canManageAppointmentConfiguration(delegatedManager)).toBe(false);
    expect(canCommentOnTask(delegatedManager)).toBe(true);
  });

  it("allows visible team members to comment without letting them change another staff member's task state", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const otherStaffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;

    expect(staffUser).not.toBeNull();
    expect(otherStaffUser).not.toBeNull();
    expect(
      canUpdateAssignedWork({
        actor: staffUser,
        assignedUserId: otherStaffUser!.id,
        requiresManagerApproval: false,
        requestedAction: "comment"
      })
    ).toBe(true);
    expect(
      canUpdateAssignedWork({
        actor: staffUser,
        assignedUserId: otherStaffUser!.id,
        requiresManagerApproval: false,
        requestedAction: "status"
      })
    ).toBe(false);
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

  it("allows managers to pass staff self-service checks for another user's work", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    expect(manager).not.toBeNull();
    expect(staffUser).not.toBeNull();
    expect(canUseStaffSelfService(manager, staffUser!.id)).toBe(true);
    expect(
      canUpdateAssignedWork({
        actor: manager,
        assignedUserId: staffUser!.id,
        requiresManagerApproval: true,
        requestedAction: "complete"
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

  it("limits appointment mutation to a manager or the accountable owner", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const owner = usersByEmail.get("jordan.sales@local.test") ?? null;
    const otherStaffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;

    expect(manager).not.toBeNull();
    expect(owner).not.toBeNull();
    expect(otherStaffUser).not.toBeNull();

    const ownerAccess = {
      canViewSchedule: true,
      canParticipate: true,
      canOwnAppointments: true,
      canManageAppointments: false,
      canViewLimitedData: true
    };
    const managerAccess = {
      ...ownerAccess,
      canManageAppointments: true
    };

    expect(
      canCreateAppointment({
        actor: owner,
        ownerUserId: owner!.id,
        locationAccess: ownerAccess
      })
    ).toBe(true);
    expect(
      canCreateAppointment({
        actor: otherStaffUser,
        ownerUserId: owner!.id,
        locationAccess: ownerAccess
      })
    ).toBe(false);
    expect(
      canMutateAppointment({
        actor: owner,
        ownerUserId: owner!.id,
        locationAccess: ownerAccess
      })
    ).toBe(true);
    expect(
      canMutateAppointment({
        actor: otherStaffUser,
        ownerUserId: owner!.id,
        locationAccess: ownerAccess
      })
    ).toBe(false);
    expect(
      canMutateAppointment({
        actor: manager,
        ownerUserId: owner!.id,
        locationAccess: managerAccess
      })
    ).toBe(true);
    expect(
      canMutateAppointment({
        actor: manager,
        ownerUserId: owner!.id,
        locationAccess: null
      })
    ).toBe(false);
    expect(
      canMutateAppointment({
        actor: null,
        ownerUserId: owner!.id,
        locationAccess: ownerAccess
      })
    ).toBe(false);
  });

  it("keeps approval, ownership transfer, and warning override manager-only", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const owner = usersByEmail.get("jordan.sales@local.test") ?? null;

    const managerAccess = {
      canViewSchedule: true,
      canParticipate: true,
      canOwnAppointments: true,
      canManageAppointments: true,
      canViewLimitedData: true
    };
    const ownerAccess = {
      ...managerAccess,
      canManageAppointments: false
    };

    expect(canApproveAppointment({ actor: manager, locationAccess: managerAccess })).toBe(true);
    expect(
      canTransferAppointmentOwnership({ actor: manager, locationAccess: managerAccess })
    ).toBe(true);
    expect(
      canOverrideAppointmentWarning({ actor: manager, locationAccess: managerAccess })
    ).toBe(true);
    expect(canApproveAppointment({ actor: owner, locationAccess: ownerAccess })).toBe(false);
    expect(
      canTransferAppointmentOwnership({ actor: owner, locationAccess: ownerAccess })
    ).toBe(false);
    expect(
      canOverrideAppointmentWarning({ actor: owner, locationAccess: ownerAccess })
    ).toBe(false);
    expect(canApproveAppointment({ actor: manager, locationAccess: ownerAccess })).toBe(false);
  });

  it("applies location and limited-data grants independently from appointment visibility", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const owner = usersByEmail.get("jordan.sales@local.test") ?? null;
    const scheduleOnlyAccess = {
      canViewSchedule: true,
      canParticipate: true,
      canOwnAppointments: true,
      canManageAppointments: false,
      canViewLimitedData: false
    };

    expect(
      canViewAppointmentSchedule({ actor: owner, locationAccess: scheduleOnlyAccess })
    ).toBe(true);
    expect(
      canViewAppointmentLimitedData({
        actor: owner,
        ownerUserId: owner!.id,
        locationAccess: scheduleOnlyAccess
      })
    ).toBe(false);
    expect(
      canViewAppointmentLimitedData({
        actor: manager,
        ownerUserId: owner!.id,
        locationAccess: {
          ...scheduleOnlyAccess,
          canManageAppointments: true,
          canViewLimitedData: true
        }
      })
    ).toBe(true);
  });

  it("keeps reassignment manager-only", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const otherStaffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;

    expect(staffUser).not.toBeNull();
    expect(otherStaffUser).not.toBeNull();
    expect(
      canUpdateAssignedWork({
        actor: staffUser,
        assignedUserId: otherStaffUser!.id,
        requiresManagerApproval: false,
        requestedAction: "reassign"
      })
    ).toBe(false);
    expect(
      canUpdateAssignedWork({
        actor: manager,
        assignedUserId: otherStaffUser!.id,
        requiresManagerApproval: false,
        requestedAction: "reassign"
      })
    ).toBe(true);
  });

  it("lets staff comment on or update their own approval-required tasks but not complete them", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    expect(staffUser).not.toBeNull();
    expect(
      canUpdateAssignedWork({
        actor: staffUser,
        assignedUserId: staffUser!.id,
        requiresManagerApproval: true,
        requestedAction: "comment"
      })
    ).toBe(true);
    expect(
      canUpdateAssignedWork({
        actor: staffUser,
        assignedUserId: staffUser!.id,
        requiresManagerApproval: true,
        requestedAction: "status"
      })
    ).toBe(true);
    expect(
      canUpdateAssignedWork({
        actor: staffUser,
        assignedUserId: staffUser!.id,
        requiresManagerApproval: true,
        requestedAction: "complete"
      })
    ).toBe(false);
  });

  it("allows any authenticated user to view the full board", async () => {
    const { usersByEmail } = await createTestAuthStore();

    expect(canViewFullBoard(usersByEmail.get("jordan.sales@local.test") ?? null)).toBe(true);
    expect(canViewFullBoard(null)).toBe(false);
  });
});
