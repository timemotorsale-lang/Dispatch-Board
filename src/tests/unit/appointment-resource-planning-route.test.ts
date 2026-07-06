import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  previewAppointmentResourcePlanning: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-resource-planning-service", () => ({
  previewAppointmentResourcePlanning: mocks.previewAppointmentResourcePlanning
}));

import { GET } from "@/app/api/appointments/[id]/resource-planning/route";

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

describe("appointment resource planning route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.previewAppointmentResourcePlanning.mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      category: "service",
      status: "READY_TO_SELECT",
      canManageResourcesForAppointment: true,
      recommendations: [
        {
          requirementCode: "SERVICE_BAY",
          label: "Service bay",
          resourceTypeCode: "SERVICE_BAY",
          status: "AVAILABLE",
          activeCandidateCount: 1,
          candidates: []
        }
      ]
    });
  });

  it("returns resource planning for an appointment", async () => {
    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/resource-planning"),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      resourcePlanning: {
        appointmentId: "appointment-1",
        status: "READY_TO_SELECT",
        recommendations: [
          {
            requirementCode: "SERVICE_BAY"
          }
        ]
      }
    });
    expect(mocks.previewAppointmentResourcePlanning).toHaveBeenCalledWith(
      managerUser,
      "appointment-1"
    );
  });

  it("maps missing appointments to 404", async () => {
    mocks.previewAppointmentResourcePlanning.mockRejectedValue(new Error("Appointment not found."));

    const response = await GET(
      new Request("http://localhost/api/appointments/missing/resource-planning"),
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

  it("maps unauthorized planning access to 403", async () => {
    mocks.previewAppointmentResourcePlanning.mockRejectedValue(
      new Error("Appointment command is not authorized.")
    );

    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/resource-planning"),
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
