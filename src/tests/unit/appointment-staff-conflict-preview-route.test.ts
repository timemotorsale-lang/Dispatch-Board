import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  previewAppointmentStaffConflicts: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-staff-conflict-preview-service", () => ({
  previewAppointmentStaffConflicts: mocks.previewAppointmentStaffConflicts
}));

import { GET } from "@/app/api/appointments/[id]/staff-conflicts/route";

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

describe("appointment staff conflict preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.previewAppointmentStaffConflicts.mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      bookingStatus: "DRAFT",
      status: "READY",
      canProceedWithStaff: true,
      staff: {
        userId: "user-brock",
        name: "Brock Peterson",
        role: "OWNER",
        roleCode: "OWNER",
        resourceId: "resource-staff-brock",
        resourceName: "Brock Peterson"
      },
      staffMembers: [
        {
          userId: "user-brock",
          name: "Brock Peterson",
          role: "OWNER",
          roleCode: "OWNER",
          resourceId: "resource-staff-brock",
          resourceName: "Brock Peterson",
          status: "READY",
          warningOverrideRequired: false,
          warningOverrideSatisfied: false,
          warningKey: null,
          reasons: []
        }
      ],
      checks: [],
      reasons: [],
      availability: null
    });
  });

  it("returns staff conflict preview for an appointment", async () => {
    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/staff-conflicts"),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      staffConflicts: {
        appointmentId: "appointment-1",
        status: "READY",
        canProceedWithStaff: true
      }
    });
    expect(mocks.previewAppointmentStaffConflicts).toHaveBeenCalledWith(
      managerUser,
      "appointment-1"
    );
  });

  it("passes proposed schedule windows to staff conflict preview", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/appointments/appointment-1/staff-conflicts?proposedStartsAt=2026-07-06T16%3A00%3A00.000Z&proposedEndsAt=2026-07-06T17%3A00%3A00.000Z&proposedSchedulingTimezone=America%2FChicago"
      ),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.previewAppointmentStaffConflicts).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      undefined,
      undefined,
      {
        proposedStartsAt: new Date("2026-07-06T16:00:00.000Z"),
        proposedEndsAt: new Date("2026-07-06T17:00:00.000Z"),
        proposedSchedulingTimezone: "America/Chicago"
      }
    );
  });

  it("maps missing appointments to 404", async () => {
    mocks.previewAppointmentStaffConflicts.mockRejectedValue(
      new Error("Appointment not found.")
    );

    const response = await GET(
      new Request("http://localhost/api/appointments/missing/staff-conflicts"),
      {
        params: Promise.resolve({
          id: "missing"
        })
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment not found."
    });
  });

  it("maps unauthorized preview access to forbidden", async () => {
    mocks.previewAppointmentStaffConflicts.mockRejectedValue(
      new Error("Appointment command is not authorized.")
    );

    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/staff-conflicts"),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment command is not authorized."
    });
  });
});
