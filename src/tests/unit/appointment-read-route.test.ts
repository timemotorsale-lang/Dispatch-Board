import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listAppointmentReadModels: vi.fn(),
  findCompanyBlocks: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: { appointment: { findMany: mocks.findCompanyBlocks } }
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
        includeCancelled: false,
        searchText: null
      }
    );
  });

  it("passes appointment search text into the server-side scoped read query", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/appointments?date=2026-07-06&search=Ahmed%20Ibrahim"
      )
    );

    expect(response.status).toBe(200);
    expect(mocks.listAppointmentReadModels).toHaveBeenCalledWith(
      managerUser,
      expect.objectContaining({
        locationId: "loc-time-motor-sales-minneapolis",
        searchText: "Ahmed Ibrahim"
      })
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

  it("shows company time blocks to staff without location details", async () => {
    mocks.listAppointmentReadModels.mockRejectedValueOnce(new Error("Appointment schedule is not authorized."));
    mocks.findCompanyBlocks.mockResolvedValueOnce([{
      id: "booking-1",
      startsAt: new Date("2026-07-06T15:00:00Z"),
      endsAt: new Date("2026-07-06T15:30:00Z"),
      bookingStatus: "SCHEDULED"
    }]);
    const response = await GET(new Request("http://localhost/api/appointments?date=2026-07-06&calendar=company"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      appointments: [{ title: "Company appointment", customer: null, viewOnly: true }]
    });
    expect(mocks.findCompanyBlocks).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-time-motor-sales", locationId: "loc-time-motor-sales-minneapolis" }),
      select: { id: true, startsAt: true, endsAt: true, bookingStatus: true }
    }));
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
