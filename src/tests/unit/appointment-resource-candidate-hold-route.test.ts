import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  holdAppointmentResourceCandidate: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-resource-candidate-availability-service", () => ({
  holdAppointmentResourceCandidate: mocks.holdAppointmentResourceCandidate
}));

import { POST } from "@/app/api/appointments/[id]/resource-reservations/[reservationId]/hold/route";

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

describe("appointment resource candidate hold route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.holdAppointmentResourceCandidate.mockResolvedValue({
      id: "reservation-proposed",
      appointmentId: "appointment-1",
      requirementId: "requirement-1",
      resourceId: "resource-bay-1",
      resourceCode: "BAY_1",
      resourceName: "Service Bay 1",
      status: "HELD",
      startsAt: new Date("2026-07-06T15:00:00.000Z"),
      endsAt: new Date("2026-07-06T16:00:00.000Z"),
      capacityUnits: 1,
      appointmentVersion: 4,
      availabilityStatus: "READY",
      warningReasons: []
    });
  });

  it("holds a proposed resource candidate", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-proposed/hold",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_CANDIDATE_HELD",
            reasonNotes: "Hold Bay 1 before scheduling.",
            correlationId: "correlation-1"
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
      reservation: {
        id: "reservation-proposed",
        resourceName: "Service Bay 1",
        status: "HELD",
        appointmentVersion: 4
      }
    });
    expect(mocks.holdAppointmentResourceCandidate).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-proposed",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_CANDIDATE_HELD",
        reasonNotes: "Hold Bay 1 before scheduling.",
        correlationId: "correlation-1"
      }
    );
  });

  it("maps stale versions to conflict", async () => {
    mocks.holdAppointmentResourceCandidate.mockRejectedValue(
      new Error("Appointment version is stale.")
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-proposed/hold",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 2,
            reasonCode: "RESOURCE_CANDIDATE_HELD",
            reasonNotes: "Hold Bay 1 before scheduling."
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

  it("maps hard-blocked holds to bad request", async () => {
    mocks.holdAppointmentResourceCandidate.mockRejectedValue(
      new Error("Resource candidate is no longer available to hold.")
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-proposed/hold",
        {
          method: "POST",
          body: JSON.stringify({
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_CANDIDATE_HELD",
            reasonNotes: "Hold Bay 1 before scheduling."
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
      error: "Resource candidate is no longer available to hold."
    });
  });
});
