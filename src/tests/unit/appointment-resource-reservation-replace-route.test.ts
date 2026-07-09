import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  replaceAppointmentResourceReservation: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-resource-planning-service", () => ({
  replaceAppointmentResourceReservation: mocks.replaceAppointmentResourceReservation
}));

import { POST } from "@/app/api/appointments/[id]/resource-reservations/[reservationId]/replace/route";
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

describe("appointment resource reservation replace route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.replaceAppointmentResourceReservation.mockResolvedValue({
      id: "reservation-replacement",
      appointmentId: "appointment-1",
      requirementId: "requirement-1",
      resourceId: "resource-bay-2",
      resourceCode: "BAY_2",
      resourceName: "Service Bay 2",
      status: "PROPOSED",
      startsAt: new Date("2026-07-06T15:00:00.000Z"),
      endsAt: new Date("2026-07-06T16:00:00.000Z"),
      capacityUnits: 1,
      created: true,
      cancelledPriorProposalCount: 0,
      appointmentVersion: 4,
      releasedReservationId: "reservation-held",
      releasedResourceId: "resource-bay-1",
      releasedResourceCode: "BAY_1",
      releasedResourceName: "Service Bay 1",
      releasedPriorStatus: "HELD"
    });
  });

  it("replaces a held resource reservation with a proposed candidate", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-held/replace",
        {
          method: "POST",
          body: JSON.stringify({
            resourceId: "resource-bay-2",
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_RESERVATION_REPLACED",
            reasonNotes: "Move from Bay 1 to Bay 2 before scheduling.",
            correlationId: "correlation-replace-1"
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

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      replacement: {
        id: "reservation-replacement",
        resourceName: "Service Bay 2",
        status: "PROPOSED",
        releasedReservationId: "reservation-held",
        releasedResourceName: "Service Bay 1",
        appointmentVersion: 4
      }
    });
    expect(mocks.replaceAppointmentResourceReservation).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-held",
        resourceId: "resource-bay-2",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_RESERVATION_REPLACED",
        reasonNotes: "Move from Bay 1 to Bay 2 before scheduling.",
        correlationId: "correlation-replace-1"
      }
    );
  });

  it("maps stale versions to conflict", async () => {
    mocks.replaceAppointmentResourceReservation.mockRejectedValue(
      new AppointmentVersionConflictError({
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 4
      })
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/reservation-held/replace",
        {
          method: "POST",
          body: JSON.stringify({
            resourceId: "resource-bay-2",
            expectedAppointmentVersion: 2,
            reasonCode: "RESOURCE_RESERVATION_REPLACED",
            reasonNotes: "Move from Bay 1 to Bay 2 before scheduling."
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

  it("maps missing held reservations to not found", async () => {
    mocks.replaceAppointmentResourceReservation.mockRejectedValue(
      new Error("Held resource reservation not found for replacement on this appointment.")
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-reservations/missing/replace",
        {
          method: "POST",
          body: JSON.stringify({
            resourceId: "resource-bay-2",
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_RESERVATION_REPLACED",
            reasonNotes: "Move from Bay 1 to Bay 2 before scheduling."
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
      error: "Held resource reservation not found for replacement on this appointment."
    });
  });
});
