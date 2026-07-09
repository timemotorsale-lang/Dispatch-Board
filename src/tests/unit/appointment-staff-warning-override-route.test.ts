import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  overrideAppointmentStaffWarning: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-staff-conflict-preview-service", () => ({
  overrideAppointmentStaffWarning: mocks.overrideAppointmentStaffWarning
}));

import { POST } from "@/app/api/appointments/[id]/staff-conflicts/override/route";
import { AppointmentVersionConflictError } from "@/server/services/appointment-version-conflict";

const managerUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

describe("appointment staff warning override route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.overrideAppointmentStaffWarning.mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      staffUserId: "user-brock",
      staffName: "Brock Peterson",
      resourceId: "resource-staff-brock",
      resourceName: "Brock Peterson",
      status: "OVERRIDDEN",
      warningCode: "STAFF_OVERLAP",
      warningKey: "STAFF|STAFF_OVERLAP|appointment-1|user-brock|resource-staff-brock",
      reasons: ["Resource capacity is already reserved during the candidate window."],
      appointmentVersion: 4
    });
  });

  it("records a manager override for a staff warning", async () => {
    const response = await POST(
      new Request("http://localhost/api/appointments/appointment-1/staff-conflicts/override", {
        method: "POST",
        body: JSON.stringify({
          expectedAppointmentVersion: 3,
          reasonCode: "STAFF_WARNING_OVERRIDDEN",
          reasonNotes: "Manager accepts overlap with backup coverage.",
          correlationId: "corr-staff-warning"
        })
      }),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      staffWarningOverride: {
        staffName: "Brock Peterson",
        status: "OVERRIDDEN",
        appointmentVersion: 4
      }
    });
    expect(mocks.overrideAppointmentStaffWarning).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        expectedAppointmentVersion: 3,
        reasonCode: "STAFF_WARNING_OVERRIDDEN",
        reasonNotes: "Manager accepts overlap with backup coverage.",
        correlationId: "corr-staff-warning",
        proposedStartsAt: null,
        proposedEndsAt: null,
        proposedSchedulingTimezone: null
      }
    );
  });

  it("passes proposed schedule windows for unscheduled draft warning overrides", async () => {
    const response = await POST(
      new Request("http://localhost/api/appointments/appointment-1/staff-conflicts/override", {
        method: "POST",
        body: JSON.stringify({
          expectedAppointmentVersion: 3,
          reasonCode: "STAFF_WARNING_OVERRIDDEN",
          reasonNotes: "Manager accepts proposed-slot overlap.",
          correlationId: "corr-proposed-staff-warning",
          proposedStartsAt: "2026-07-06T16:00:00.000Z",
          proposedEndsAt: "2026-07-06T17:00:00.000Z",
          proposedSchedulingTimezone: "America/Chicago"
        })
      }),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.overrideAppointmentStaffWarning).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        expectedAppointmentVersion: 3,
        reasonCode: "STAFF_WARNING_OVERRIDDEN",
        reasonNotes: "Manager accepts proposed-slot overlap.",
        correlationId: "corr-proposed-staff-warning",
        proposedStartsAt: new Date("2026-07-06T16:00:00.000Z"),
        proposedEndsAt: new Date("2026-07-06T17:00:00.000Z"),
        proposedSchedulingTimezone: "America/Chicago"
      }
    );
  });

  it("maps stale versions to conflict", async () => {
    mocks.overrideAppointmentStaffWarning.mockRejectedValue(
      new AppointmentVersionConflictError({
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 4
      })
    );

    const response = await POST(
      new Request("http://localhost/api/appointments/appointment-1/staff-conflicts/override", {
        method: "POST",
        body: JSON.stringify({
          expectedAppointmentVersion: 2,
          reasonCode: "STAFF_WARNING_OVERRIDDEN",
          reasonNotes: "Stale staff warning override."
        })
      }),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment version is stale.",
      conflict: {
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 4
      }
    });
  });

  it("maps manager authorization failures to forbidden", async () => {
    mocks.overrideAppointmentStaffWarning.mockRejectedValue(
      new Error("Only an authorized manager can override appointment warnings.")
    );

    const response = await POST(
      new Request("http://localhost/api/appointments/appointment-1/staff-conflicts/override", {
        method: "POST",
        body: JSON.stringify({
          expectedAppointmentVersion: 3,
          reasonCode: "STAFF_WARNING_OVERRIDDEN",
          reasonNotes: "Unauthorized staff warning override."
        })
      }),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only an authorized manager can override appointment warnings."
    });
  });
});
