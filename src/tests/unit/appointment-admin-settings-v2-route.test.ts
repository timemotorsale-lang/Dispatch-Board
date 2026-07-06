import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createAppointmentLocationClosureForManager: vi.fn(),
  updateAppointmentResourceForManager: vi.fn(),
  createAppointmentResourceUnavailabilityForManager: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-admin-settings", () => ({
  createAppointmentLocationClosureForManager: mocks.createAppointmentLocationClosureForManager,
  updateAppointmentResourceForManager: mocks.updateAppointmentResourceForManager,
  createAppointmentResourceUnavailabilityForManager:
    mocks.createAppointmentResourceUnavailabilityForManager
}));

import { POST as POSTClosure } from "@/app/api/settings/appointments/closures/route";
import { PATCH as PATCHResource } from "@/app/api/settings/appointments/resources/[resourceId]/route";
import { POST as POSTResourceUnavailability } from "@/app/api/settings/appointments/resources/[resourceId]/unavailability/route";

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

const settings = {
  closures: [],
  resources: []
};

describe("appointment admin settings v2 routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.createAppointmentLocationClosureForManager.mockResolvedValue(settings);
    mocks.updateAppointmentResourceForManager.mockResolvedValue(settings);
    mocks.createAppointmentResourceUnavailabilityForManager.mockResolvedValue(settings);
  });

  it("creates location closures for managers", async () => {
    const payload = {
      type: "HOLIDAY",
      name: "Independence Day",
      startsAt: "2026-07-04T14:00:00.000Z",
      endsAt: "2026-07-05T00:00:00.000Z",
      reason: "Holiday closure."
    };

    const response = await POSTClosure(
      new Request("http://localhost/api/settings/appointments/closures", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.createAppointmentLocationClosureForManager).toHaveBeenCalledWith(
      managerUser,
      payload
    );
  });

  it("updates resource admin controls for managers", async () => {
    const payload = {
      status: "ACTIVE",
      capacityMode: "CAPACITY",
      capacity: 2,
      conflictPolicy: "WARNING"
    };

    const response = await PATCHResource(
      new Request("http://localhost/api/settings/appointments/resources/res-abdi", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
      {
        params: Promise.resolve({ resourceId: "res-abdi" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.updateAppointmentResourceForManager).toHaveBeenCalledWith(managerUser, {
      ...payload,
      resourceId: "res-abdi"
    });
  });

  it("creates resource unavailability windows for managers", async () => {
    const payload = {
      type: "OUTAGE",
      startsAt: "2026-07-08T14:00:00.000Z",
      endsAt: "2026-07-08T18:00:00.000Z",
      capacityReduction: null,
      reason: "Lift maintenance."
    };

    const response = await POSTResourceUnavailability(
      new Request("http://localhost/api/settings/appointments/resources/res-abdi/unavailability", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
      {
        params: Promise.resolve({ resourceId: "res-abdi" })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.createAppointmentResourceUnavailabilityForManager).toHaveBeenCalledWith(
      managerUser,
      {
        ...payload,
        resourceId: "res-abdi"
      }
    );
  });

  it("rejects malformed route payloads", async () => {
    const response = await POSTClosure(
      new Request("http://localhost/api/settings/appointments/closures", {
        method: "POST",
        body: JSON.stringify({ type: "HOLIDAY" })
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createAppointmentLocationClosureForManager).not.toHaveBeenCalled();
  });
});
