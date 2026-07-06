import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listAppointmentReadModels: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-read-service", () => ({
  listAppointmentReadModels: mocks.listAppointmentReadModels
}));

import { GET } from "@/app/api/appointments/route";

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

describe("appointment read route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.listAppointmentReadModels.mockResolvedValue({
      locationId: "loc-time-motor-sales-minneapolis",
      windowStart: "2026-07-06T05:00:00.000Z",
      windowEnd: "2026-07-07T05:00:00.000Z",
      appointmentCount: 0,
      appointments: []
    });
  });

  it("loads appointment read models for the approved Minneapolis board day", async () => {
    const response = await GET(
      new Request("http://localhost/api/appointments?date=2026-07-06")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      date: "2026-07-06",
      locationId: "loc-time-motor-sales-minneapolis",
      location: {
        id: "loc-time-motor-sales-minneapolis",
        timezone: "America/Chicago"
      },
      appointmentCount: 0,
      appointments: []
    });
    expect(mocks.listAppointmentReadModels).toHaveBeenCalledWith(
      managerUser,
      {
        locationId: "loc-time-motor-sales-minneapolis",
        windowStart: new Date("2026-07-06T05:00:00.000Z"),
        windowEnd: new Date("2026-07-07T05:00:00.000Z"),
        includeCancelled: false
      }
    );
  });

  it("maps authorization failures to 403", async () => {
    mocks.listAppointmentReadModels.mockRejectedValue(
      new Error("Appointment schedule is not authorized.")
    );

    const response = await GET(
      new Request("http://localhost/api/appointments?date=2026-07-06")
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment schedule is not authorized."
    });
  });

  it("maps invalid date input to 400", async () => {
    const response = await GET(new Request("http://localhost/api/appointments?date=soon"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment read query date must use YYYY-MM-DD."
    });
    expect(mocks.listAppointmentReadModels).not.toHaveBeenCalled();
  });
});
