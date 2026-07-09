import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  releaseAppointmentResourceReservation: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-resource-candidate-availability-service", () => ({
  releaseAppointmentResourceReservation: mocks.releaseAppointmentResourceReservation
}));

import { POST } from "@/app/api/appointments/[id]/resource-reservations/[reservationId]/release/route";
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

describe("appointment resource reservation release route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.releaseAppointmentResourceReservation.mockResolvedValue({
      id: "reservation-held",
      appointmentId: "appointment-1",
      requirementId: "requirement-1",
      resourceId: "resource-bay-1",
      resourceCode: "BAY_1",
      resourceName: "Service Bay 1",
      priorStatus: "HELD",
      status: "RELEASED",
      startsAt: new Date("2026-07-06T15:00:00.000Z"),
      endsAt: new Date("2026-07-06T16:00:00.000Z"),
      capacityUnits: 1,
      appointmentVersion: 4
    });
  });

  it("releases a held or committed resource reservation", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-held/release",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_RESERVATION_RELEASED",
            reasonNotes: "Release Bay 1 after customer changed timing.",
            correlationId: "correlation-release-1"
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          reservationId: "reservation-held"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reservation: {
        id: "reservation-held",
        resourceName: "Service Bay 1",
        priorStatus: "HELD",
        status: "RELEASED",
        appointmentVersion: 4
      }
    });
    expect(mocks.releaseAppointmentResourceReservation).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-held",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_RESERVATION_RELEASED",
        reasonNotes: "Release Bay 1 after customer changed timing.",
        correlationId: "correlation-release-1"
      }
    );
  });

  it("maps stale versions to conflict", async () => {
    mocks.releaseAppointmentResourceReservation.mockRejectedValue(
      new AppointmentVersionConflictError({
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 4
      })
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-held/release",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 2,
            reasonCode: "RESOURCE_RESERVATION_RELEASED",
            reasonNotes: "Release Bay 1 after customer changed timing."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          reservationId: "reservation-held"
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

  it("maps missing reservations to not found", async () => {
    mocks.releaseAppointmentResourceReservation.mockRejectedValue(
      new Error("Resource reservation not found for release on this appointment.")
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/missing/release",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_RESERVATION_RELEASED",
            reasonNotes: "Release missing reservation."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          reservationId: "missing"
        })
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Resource reservation not found for release on this appointment."
    });
  });
});
