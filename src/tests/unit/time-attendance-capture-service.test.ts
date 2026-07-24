import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { submitTimeAttendanceCaptureCommand } from "@/server/time-attendance";
import type { TimeAttendanceCaptureRepository } from "@/server/time-attendance/capture-repository";

const staff: AuthenticatedUser = {
  id: "staff-1",
  name: "Staff One",
  email: "staff@example.com",
  isActive: true,
  roles: ["Mechanic"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.com",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const otherStaff: AuthenticatedUser = {
  ...staff,
  id: "staff-2",
  email: "other@example.com"
};

function repository(overrides: Partial<TimeAttendanceCaptureRepository> = {}) {
  const commitCapture = vi.fn(async (input) => ({
    command: {
      id: "cmd-1",
      correlationId: "corr-1",
      resultSnapshot: { ok: true },
      resultingVersion: input.expectedVersion + 1
    },
    duplicate: false,
    event: {
      id: "evt-1",
      eventType: input.commandType,
      occurredAt: new Date(input.occurredAt),
      recordedAt: new Date("2026-07-23T14:00:01.000Z"),
      sessionId: "session-1"
    },
    session: {
      id: "session-1",
      organizationId: input.organizationId,
      locationId: input.locationId,
      staffUserId: input.staffUserId,
      state: input.commandType === "CLOCK_OUT" ? "CLOSED" as const : "OPEN" as const,
      version: input.expectedVersion + 1
    },
    version: input.expectedVersion + 1
  }));

  return {
    repository: { commitCapture, ...overrides },
    commitCapture
  };
}

describe("time attendance capture service", () => {
  it("accepts a staff member clocking themself in", async () => {
    const fake = repository();
    const result = await submitTimeAttendanceCaptureCommand(staff, {
      commandType: "CLOCK_IN",
      expectedVersion: 0,
      idempotencyKey: "clock-in-1",
      locationId: "loc-1",
      occurredAt: "2026-07-23T14:00:00.000Z",
      reason: "Employee clocked in from the web console.",
      timezone: "America/Chicago"
    }, {
      organizationId: "org-1",
      repository: fake.repository
    });

    expect(result).toMatchObject({
      commandId: "cmd-1",
      duplicate: false,
      session: { id: "session-1", staffUserId: "staff-1", version: 1 },
      version: 1
    });
    expect(fake.commitCapture).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "staff-1",
      staffUserId: "staff-1"
    }));
  });

  it("allows a manager to capture time for another staff member", async () => {
    const fake = repository();
    await expect(submitTimeAttendanceCaptureCommand(manager, {
      commandType: "START_MEAL",
      expectedVersion: 1,
      idempotencyKey: "meal-start-1",
      locationId: "loc-1",
      occurredAt: "2026-07-23T18:00:00.000Z",
      paid: false,
      reason: "Manager recorded observed meal start.",
      staffUserId: "staff-1",
      timezone: "America/Chicago"
    }, {
      organizationId: "org-1",
      repository: fake.repository
    })).resolves.toMatchObject({ version: 2 });

    expect(fake.commitCapture).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "manager-1",
      paid: false,
      staffUserId: "staff-1"
    }));
  });

  it("rejects a non-manager capturing another staff member's time", async () => {
    const fake = repository();
    await expect(submitTimeAttendanceCaptureCommand(otherStaff, {
      commandType: "CLOCK_OUT",
      expectedVersion: 2,
      idempotencyKey: "clock-out-1",
      locationId: "loc-1",
      occurredAt: "2026-07-23T23:00:00.000Z",
      reason: "Attempting to clock out another staff member.",
      staffUserId: "staff-1",
      timezone: "America/Chicago"
    }, {
      organizationId: "org-1",
      repository: fake.repository
    })).rejects.toThrow("Only the staff member or a manager");

    expect(fake.commitCapture).not.toHaveBeenCalled();
  });
});
