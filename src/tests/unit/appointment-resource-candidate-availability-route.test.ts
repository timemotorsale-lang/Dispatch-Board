import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  previewAppointmentResourceCandidateAvailability: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-resource-candidate-availability-service", () => ({
  previewAppointmentResourceCandidateAvailability:
    mocks.previewAppointmentResourceCandidateAvailability
}));

import { GET } from "@/app/api/appointments/[id]/resource-candidate-availability/route";

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

describe("appointment resource candidate availability route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.previewAppointmentResourceCandidateAvailability.mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      status: "READY",
      canProceedToHold: true,
      proposals: [
        {
          reservationId: "reservation-proposed",
          requirementId: "requirement-1",
          requirementCode: "SERVICE_BAY",
          resourceId: "resource-bay-1",
          resourceCode: "BAY_1",
          resourceName: "Service Bay 1",
          status: "READY",
          canProceedToHold: true,
          reasons: []
        }
      ]
    });
  });

  it("returns resource candidate availability for an appointment", async () => {
    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/resource-candidate-availability"),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      resourceCandidateAvailability: {
        appointmentId: "appointment-1",
        status: "READY",
        proposals: [
          {
            reservationId: "reservation-proposed",
            status: "READY"
          }
        ]
      }
    });
    expect(mocks.previewAppointmentResourceCandidateAvailability).toHaveBeenCalledWith(
      managerUser,
      "appointment-1"
    );
  });

  it("maps missing appointments to 404", async () => {
    mocks.previewAppointmentResourceCandidateAvailability.mockRejectedValue(
      new Error("Appointment not found.")
    );

    const response = await GET(
      new Request("http://localhost/api/appointments/missing/resource-candidate-availability"),
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

  it("maps unauthorized access to forbidden", async () => {
    mocks.previewAppointmentResourceCandidateAvailability.mockRejectedValue(
      new Error("Appointment command is not authorized.")
    );

    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/resource-candidate-availability"),
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
