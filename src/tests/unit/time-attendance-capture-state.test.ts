import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createTimeAttendanceCaptureStateRepository,
  getTimeAttendanceCaptureState,
  type TimeAttendanceCaptureStateRepository
} from "@/server/time-attendance";

const staff: AuthenticatedUser = {
  id: "staff-1",
  name: "Staff One",
  email: "staff@example.com",
  isActive: true,
  roles: ["Mechanic"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

describe("time attendance capture state", () => {
  it("projects a staff member with no open session as ready to clock in", async () => {
    const getCurrentState = vi.fn<TimeAttendanceCaptureStateRepository["getCurrentState"]>(async (input) => ({
      allowedActions: ["CLOCK_IN"],
      expectedVersion: 0,
      locationId: input.locationId,
      nextPrimaryAction: "CLOCK_IN",
      session: null,
      staffUserId: input.staffUserId,
      state: "NONE",
      statusLabel: "Ready to clock in",
      timezone: input.timezone
    }));

    await expect(getTimeAttendanceCaptureState(staff, {
      locationId: "loc-1",
      organizationId: "org-1",
      repository: { getCurrentState },
      timezone: "America/Chicago"
    })).resolves.toMatchObject({
      allowedActions: ["CLOCK_IN"],
      expectedVersion: 0,
      staffUserId: "staff-1",
      state: "NONE",
      statusLabel: "Ready to clock in"
    });
    expect(getCurrentState).toHaveBeenCalledWith(expect.objectContaining({
      locationId: "loc-1",
      organizationId: "org-1",
      staffUserId: "staff-1"
    }));
  });

  it("projects an open session as meal-start or clock-out capable", async () => {
    const repository = createTimeAttendanceCaptureStateRepository({
      $transaction: async (callback) => callback({
        enterpriseAggregateVersion: {
          findUnique: async () => ({ version: 3 })
        },
        timeAttendanceSession: {
          findFirst: async () => ({
            id: "session-1",
            openedAt: new Date("2026-07-24T14:00:00.000Z"),
            state: "OPEN",
            version: 3
          })
        }
      })
    });

    await expect(repository.getCurrentState({
      locationId: "loc-1",
      organizationId: "org-1",
      staffUserId: "staff-1",
      timezone: "America/Chicago"
    })).resolves.toMatchObject({
      allowedActions: ["START_MEAL", "START_PAID_REST", "CLOCK_OUT"],
      expectedVersion: 3,
      nextPrimaryAction: "START_MEAL",
      session: { id: "session-1", state: "OPEN", version: 3 },
      state: "OPEN",
      statusLabel: "Clocked in"
    });
  });

  it("projects an active meal as end-meal capable", async () => {
    const repository = createTimeAttendanceCaptureStateRepository({
      $transaction: async (callback) => callback({
        enterpriseAggregateVersion: {
          findUnique: async () => ({ version: 7 })
        },
        timeAttendanceSession: {
          findFirst: async () => ({
            id: "session-2",
            openedAt: new Date("2026-07-24T14:00:00.000Z"),
            state: "ON_MEAL",
            version: 7
          })
        }
      })
    });

    await expect(repository.getCurrentState({
      locationId: "loc-1",
      organizationId: "org-1",
      staffUserId: "staff-1",
      timezone: "America/Chicago"
    })).resolves.toMatchObject({
      allowedActions: ["END_MEAL"],
      expectedVersion: 7,
      nextPrimaryAction: "END_MEAL",
      state: "ON_MEAL",
      statusLabel: "On meal break"
    });
  });
});
