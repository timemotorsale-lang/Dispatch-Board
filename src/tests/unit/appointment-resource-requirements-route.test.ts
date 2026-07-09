import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  attachRecommendedAppointmentResourceRequirement: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-resource-planning-service", () => ({
  attachRecommendedAppointmentResourceRequirement:
    mocks.attachRecommendedAppointmentResourceRequirement
}));

import { POST } from "@/app/api/appointments/[id]/resource-requirements/route";
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

describe("appointment resource requirements route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.attachRecommendedAppointmentResourceRequirement.mockResolvedValue({
      id: "requirement-created",
      appointmentId: "appointment-1",
      resourceTypeId: "resource-type-service-bay",
      requirementCode: "SERVICE_BAY",
      requiredCapacity: 1,
      isMandatory: true,
      assignmentTiming: "AT_BOOKING",
      hardBlockIfUnfulfilled: true,
      created: true,
      appointmentVersion: 4
    });
  });

  it("attaches a recommended resource requirement", async () => {
    const response = await POST(
      new Request("http://localhost/api/appointments/appointment-1/resource-requirements", {
        method: "POST",
        body: JSON.stringify({
          requirementCode: "SERVICE_BAY",
          expectedAppointmentVersion: 3,
          reasonCode: "RESOURCE_REQUIREMENT_ADDED",
          reasonNotes: "Attach service bay before scheduling.",
          correlationId: "correlation-1"
        })
      }),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      requirement: {
        id: "requirement-created",
        created: true,
        appointmentVersion: 4
      }
    });
    expect(mocks.attachRecommendedAppointmentResourceRequirement).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        requirementCode: "SERVICE_BAY",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_REQUIREMENT_ADDED",
        reasonNotes: "Attach service bay before scheduling.",
        correlationId: "correlation-1"
      }
    );
  });

  it("maps stale versions to conflict", async () => {
    mocks.attachRecommendedAppointmentResourceRequirement.mockRejectedValue(
      new AppointmentVersionConflictError({
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 4
      })
    );

    const response = await POST(
      new Request("http://localhost/api/appointments/appointment-1/resource-requirements", {
        method: "POST",
        body: JSON.stringify({
          requirementCode: "SERVICE_BAY",
          expectedAppointmentVersion: 2,
          reasonCode: "RESOURCE_REQUIREMENT_ADDED",
          reasonNotes: "Attach service bay before scheduling."
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

  it("maps unauthorized access to forbidden", async () => {
    mocks.attachRecommendedAppointmentResourceRequirement.mockRejectedValue(
      new Error("Appointment command is not authorized.")
    );

    const response = await POST(
      new Request("http://localhost/api/appointments/appointment-1/resource-requirements", {
        method: "POST",
        body: JSON.stringify({
          requirementCode: "SERVICE_BAY",
          expectedAppointmentVersion: 3,
          reasonCode: "RESOURCE_REQUIREMENT_ADDED",
          reasonNotes: "Attach service bay before scheduling."
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
      error: "Appointment command is not authorized."
    });
  });
});
