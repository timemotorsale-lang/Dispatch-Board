import { describe, expect, it, vi } from "vitest";

import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { StaffDayGenerationUser, StaffDayRecord, StaffDayRepository } from "@/server/repositories/staff-day-repository";
import { buildStaffDayDutySnapshots, generateStaffDayPlans, getStaffDay, startStaffDay } from "@/server/services/staff-day";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Eli Manager",
  email: "manager@example.com",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const staff: AuthenticatedUser = {
  ...manager,
  id: "staff-1",
  name: "Baraka Sales",
  roles: ["Sales"]
};

function generationUser(): StaffDayGenerationUser {
  const duty = {
    id: "duty-1",
    name: "Review customer follow-ups",
    workflowArea: "SALES",
    description: "Review open customer commitments.",
    createdAt: new Date("2026-07-11T00:00:00Z"),
    updatedAt: new Date("2026-07-11T00:00:00Z")
  };

  return {
    id: "staff-1",
    name: "Baraka Sales",
    email: "staff@example.com",
    passwordHash: "hash",
    isActive: true,
    createdAt: new Date("2026-07-11T00:00:00Z"),
    updatedAt: new Date("2026-07-11T00:00:00Z"),
    userDuties: [{ assignedAt: new Date("2026-07-11T00:00:00Z"), dutyId: duty.id, userId: "staff-1", duty }],
    userRoles: [{
      assignedAt: new Date("2026-07-11T00:00:00Z"),
      roleId: "role-1",
      userId: "staff-1",
      role: {
        id: "role-1",
        name: "Sales",
        description: null,
        createdAt: new Date("2026-07-11T00:00:00Z"),
        updatedAt: new Date("2026-07-11T00:00:00Z"),
        roleDuties: [{ assignedAt: new Date("2026-07-11T00:00:00Z"), dutyId: duty.id, roleId: "role-1", duty }]
      }
    }]
  };
}

function repository(overrides: Partial<StaffDayRepository> = {}): StaffDayRepository {
  return {
    findBoardDay: vi.fn(async () => ({ id: "board-1" })),
    findForUser: vi.fn(async () => null),
    listActiveUsers: vi.fn(async () => [generationUser()]),
    upsertPlan: vi.fn(async () => ({ id: "staff-day-1" }) as StaffDayRecord),
    startDay: vi.fn(async () => ({ id: "staff-day-1" }) as StaffDayRecord),
    findDutyItem: vi.fn(async () => null),
    updateDutyItem: vi.fn(async () => undefined),
    ...overrides
  };
}

describe("staff execution domain foundation", () => {
  it("keeps every child capability off until the master flag is enabled", () => {
    expect(getStaffExecutionFlags({ STAFF_EXECUTION_START_DAY_ENABLED: "true" })).toEqual({
      enabled: false,
      startDayGateEnabled: false,
      taskAcceptanceEnabled: false,
      availableWorkEnabled: false,
      endOfDayReportEnabled: false,
      managerHealthEnabled: false
    });
  });

  it("deduplicates role and direct duty assignments and prefers the direct source", () => {
    const snapshots = buildStaffDayDutySnapshots(generationUser());
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ sourceKey: "duty:duty-1", sourceType: "DIRECT", sourceRoleId: null, sortOrder: 0 });
  });

  it("generates retry-safe plans through repository upserts when enabled", async () => {
    const testRepository = repository();
    const flags = { ...getStaffExecutionFlags({ STAFF_EXECUTION_ENABLED: "true" }), enabled: true };
    const first = await generateStaffDayPlans(manager, "2026-07-11", { flags, repository: testRepository });
    const second = await generateStaffDayPlans(manager, "2026-07-11", { flags, repository: testRepository });
    expect(first.generatedCount).toBe(1);
    expect(second.generatedCount).toBe(1);
    expect(testRepository.upsertPlan).toHaveBeenCalledTimes(2);
  });

  it("returns an explicit disabled read model without touching persistence", async () => {
    const testRepository = repository();
    await expect(getStaffDay(staff, "2026-07-11", undefined, { repository: testRepository })).resolves.toEqual({
      boardDate: "2026-07-11",
      enabled: false,
      staffDay: null,
      startDayEnabled: false
    });
    expect(testRepository.findForUser).not.toHaveBeenCalled();
  });

  it("prevents staff from reading another user's staff day", async () => {
    await expect(getStaffDay(staff, "2026-07-11", "staff-2", { repository: repository() })).rejects.toThrow(
      "You do not have permission to view this staff day."
    );
  });

  it("requires priority acknowledgement before Start Day", async () => {
    const flags = {
      ...getStaffExecutionFlags({ STAFF_EXECUTION_ENABLED: "true", STAFF_EXECUTION_START_DAY_ENABLED: "true" }),
      enabled: true,
      startDayGateEnabled: true
    };
    await expect(startStaffDay(staff, "2026-07-11", { reviewedPriorities: false }, { flags, repository: repository() })).rejects.toThrow(
      "Start Day requires priority acknowledgement."
    );
  });

  it("requires useful context when a starting blocker is declared", async () => {
    const flags = {
      ...getStaffExecutionFlags({ STAFF_EXECUTION_ENABLED: "true", STAFF_EXECUTION_START_DAY_ENABLED: "true" }),
      enabled: true,
      startDayGateEnabled: true
    };
    await expect(startStaffDay(staff, "2026-07-11", { reviewedPriorities: true, hasBlocker: true }, { flags, repository: repository() })).rejects.toThrow(
      "Starting blockers require a category and note."
    );
  });
});
