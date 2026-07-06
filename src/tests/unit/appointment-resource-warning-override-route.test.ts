import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  overrideAppointmentResourceWarning: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-resource-candidate-availability-service", () => ({
  overrideAppointmentResourceWarning: mocks.overrideAppointmentResourceWarning
}));

import { POST } from "@/app/api/appointments/[id]/resource-reservations/[reservationId]/warning-override/route";

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

describe("appointment resource warning override route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.overrideAppointmentResourceWarning.mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      reservationId: "reservation-proposed",
      requirementId: "requirement-1",
      requirementCode: "SERVICE_BAY",
      resourceId: "resource-bay-1",
      resourceCode: "BAY_1",
      resourceName: "Service Bay 1",
      status: "OVERRIDDEN",
      warningCode: "RESOURCE_WARNING",
      warningKey: "RESOURCE|RESOURCE_WARNING|appointment-1|reservation-proposed|resource-bay-1",
      reasons: ["Resource capacity is already reserved during the candidate window."],
      appointmentVersion: 4
    });
  });

  it("records a manager override for a resource warning", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-proposed/warning-override",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
            reasonNotes: "Manager accepts a warning-level bay overlap.",
            correlationId: "correlation-warning-1"
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          reservationId: "reservation-proposed"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      warningOverride: {
        reservationId: "reservation-proposed",
        resourceName: "Service Bay 1",
        status: "OVERRIDDEN",
        appointmentVersion: 4
      }
    });
    expect(mocks.overrideAppointmentResourceWarning).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-proposed",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
        reasonNotes: "Manager accepts a warning-level bay overlap.",
        correlationId: "correlation-warning-1"
      }
    );
  });

  it("maps stale versions to conflict", async () => {
    mocks.overrideAppointmentResourceWarning.mockRejectedValue(
      new Error("Appointment version is stale.")
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-proposed/warning-override",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 2,
            reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
            reasonNotes: "Manager accepts a warning-level bay overlap."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          reservationId: "reservation-proposed"
        })
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment version is stale."
    });
  });

  it("maps manager authorization failures to forbidden", async () => {
    mocks.overrideAppointmentResourceWarning.mockRejectedValue(
      new Error("Only an authorized manager can override appointment warnings.")
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-proposed/warning-override",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
            reasonNotes: "Non-manager attempt."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          reservationId: "reservation-proposed"
        })
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only an authorized manager can override appointment warnings."
    });
  });

  it("maps hard-block override attempts to bad request", async () => {
    mocks.overrideAppointmentResourceWarning.mockRejectedValue(
      new Error("Resource hard blocks cannot be overridden.")
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-proposed/warning-override",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
            reasonNotes: "Attempt to override a hard block."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          reservationId: "reservation-proposed"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Resource hard blocks cannot be overridden."
    });
  });
});
