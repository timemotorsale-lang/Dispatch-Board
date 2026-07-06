import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  previewAppointmentScheduleReadiness: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-schedule-readiness-service", () => ({
  previewAppointmentScheduleReadiness: mocks.previewAppointmentScheduleReadiness
}));

import { GET } from "@/app/api/appointments/[id]/schedule-readiness/route";

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

describe("appointment schedule readiness route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.previewAppointmentScheduleReadiness.mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      bookingStatus: "DRAFT",
      status: "WARNING",
      canSubmitSchedule: true,
      hardBlocks: [],
      warnings: [
        {
          code: "RESOURCE_REQUIREMENTS_NOT_SELECTED",
          message: "No schedulable resource requirement is selected yet."
        }
      ],
      checks: []
    });
  });

  it("returns schedule readiness for an appointment", async () => {
    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/schedule-readiness"),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      readiness: {
        appointmentId: "appointment-1",
        status: "WARNING",
        canSubmitSchedule: true
      }
    });
    expect(mocks.previewAppointmentScheduleReadiness).toHaveBeenCalledWith(
      managerUser,
      "appointment-1"
    );
  });

  it("maps missing appointments to 404", async () => {
    mocks.previewAppointmentScheduleReadiness.mockRejectedValue(new Error("Appointment not found."));

    const response = await GET(
      new Request("http://localhost/api/appointments/missing/schedule-readiness"),
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

  it("maps unauthorized preview access to 403", async () => {
    mocks.previewAppointmentScheduleReadiness.mockRejectedValue(
      new Error("Appointment command is not authorized.")
    );

    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/schedule-readiness"),
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
