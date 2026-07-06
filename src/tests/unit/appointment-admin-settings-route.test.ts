import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAppointmentAdminSettingsForManager: vi.fn(),
  updateAppointmentAdminSettings: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-admin-settings", () => ({
  getAppointmentAdminSettingsForManager: mocks.getAppointmentAdminSettingsForManager,
  updateAppointmentAdminSettings: mocks.updateAppointmentAdminSettings
}));

import { GET, PATCH } from "@/app/api/settings/appointments/route";

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

const appointmentSettings = {
  location: {
    id: "loc-time-motor-sales-minneapolis",
    name: "Time Motor Sales — Minneapolis",
    timezone: "America/Chicago",
    displayAddress: "1101 E. Lake Street, Minneapolis MN 55407",
    displayPhone: "(612) 724-3631",
    businessHoursLabel: "9:00 AM - 6:00 PM"
  },
  operatingWindows: []
};

describe("appointment admin settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.getAppointmentAdminSettingsForManager.mockResolvedValue(appointmentSettings);
    mocks.updateAppointmentAdminSettings.mockResolvedValue(appointmentSettings);
  });

  it("loads appointment admin settings for managers", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: appointmentSettings
    });
    expect(mocks.getAppointmentAdminSettingsForManager).toHaveBeenCalledWith(managerUser);
  });

  it("updates appointment admin settings through the protected service", async () => {
    const payload = {
      location: {
        name: "Time Motor Sales — Minneapolis",
        timezone: "America/Chicago",
        city: "Minneapolis",
        region: "MN",
        schedulingStatus: "ACTIVE"
      },
      operatingWindows: [
        {
          businessDay: "MONDAY",
          isOpen: true,
          opensAt: "09:00",
          closesAt: "18:00"
        }
      ]
    };

    const response = await PATCH(
      new Request("http://localhost/api/settings/appointments", {
        method: "PATCH",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: appointmentSettings
    });
    expect(mocks.updateAppointmentAdminSettings).toHaveBeenCalledWith(managerUser, payload);
  });

  it("rejects malformed update payloads", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/settings/appointments", {
        method: "PATCH",
        body: JSON.stringify({ location: null })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment location and operating windows are required."
    });
    expect(mocks.updateAppointmentAdminSettings).not.toHaveBeenCalled();
  });

  it("maps manager access failures to 403", async () => {
    mocks.getAppointmentAdminSettingsForManager.mockRejectedValue(
      new Error("Manager access required.")
    );

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Manager access required."
    });
  });
});
