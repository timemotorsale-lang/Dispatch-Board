import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAppointmentReadModelById: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-read-service", () => ({
  getAppointmentReadModelById: mocks.getAppointmentReadModelById
}));

import { GET } from "@/app/api/appointments/[id]/route";

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

describe("appointment direct detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.getAppointmentReadModelById.mockResolvedValue({
      id: "appointment-1",
      appointmentNumber: "APT-10245",
      customer: {
        displayName: "Ahmed Ibrahim",
        phoneNumber: "612-555-0147",
        email: "ahmed@example.test"
      },
      visibility: {
        relationship: "MANAGER",
        dataAccessLevel: "LIMITED_DETAIL",
        canMutate: true,
        canViewSensitiveContact: true
      }
    });
  });

  it("returns a permission-filtered direct appointment detail payload", async () => {
    const response = await GET(new Request("http://localhost/api/appointments/appointment-1"), {
      params: Promise.resolve({
        id: "appointment-1"
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      appointment: {
        id: "appointment-1",
        appointmentNumber: "APT-10245",
        visibility: {
          relationship: "MANAGER",
          canMutate: true
        }
      }
    });
    expect(mocks.getAppointmentReadModelById).toHaveBeenCalledWith(managerUser, "appointment-1");
  });

  it("maps missing or unauthorized direct detail to the same safe not-available response", async () => {
    mocks.getAppointmentReadModelById.mockRejectedValue(
      new Error("Appointment detail is not available.")
    );

    const response = await GET(new Request("http://localhost/api/appointments/appointment-1"), {
      params: Promise.resolve({
        id: "appointment-1"
      })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment detail is not available."
    });
  });

  it("maps authentication and invalid id errors without exposing appointment detail", async () => {
    mocks.getAppointmentReadModelById.mockRejectedValueOnce(new Error("Authentication required."));

    const unauthenticatedResponse = await GET(
      new Request("http://localhost/api/appointments/appointment-1"),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(unauthenticatedResponse.status).toBe(401);
    await expect(unauthenticatedResponse.json()).resolves.toEqual({
      error: "Authentication required."
    });

    mocks.getAppointmentReadModelById.mockRejectedValueOnce(
      new Error("Appointment id is required.")
    );

    const invalidIdResponse = await GET(new Request("http://localhost/api/appointments/%20"), {
      params: Promise.resolve({
        id: " "
      })
    });

    expect(invalidIdResponse.status).toBe(400);
    await expect(invalidIdResponse.json()).resolves.toEqual({
      error: "Appointment id is required."
    });
  });
});
