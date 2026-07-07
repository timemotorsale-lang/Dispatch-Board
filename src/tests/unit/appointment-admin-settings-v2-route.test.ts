import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createAppointmentLocationClosureForManager: vi.fn(),
  applyRecurringAppointmentClosureTemplateForManager: vi.fn(),
  updateAppointmentLocationClosureForManager: vi.fn(),
  deleteAppointmentLocationClosureForManager: vi.fn(),
  updateAppointmentResourceForManager: vi.fn(),
  createAppointmentResourceTypeForManager: vi.fn(),
  updateAppointmentResourceTypeForManager: vi.fn(),
  createAppointmentResourceOperatingWindowBatchForManager: vi.fn(),
  createAppointmentResourceOperatingWindowForManager: vi.fn(),
  deleteAppointmentResourceOperatingWindowForManager: vi.fn(),
  createAppointmentResourceUnavailabilityForManager: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-admin-settings", () => ({
  createAppointmentLocationClosureForManager: mocks.createAppointmentLocationClosureForManager,
  applyRecurringAppointmentClosureTemplateForManager:
    mocks.applyRecurringAppointmentClosureTemplateForManager,
  updateAppointmentLocationClosureForManager: mocks.updateAppointmentLocationClosureForManager,
  deleteAppointmentLocationClosureForManager: mocks.deleteAppointmentLocationClosureForManager,
  updateAppointmentResourceForManager: mocks.updateAppointmentResourceForManager,
  createAppointmentResourceTypeForManager: mocks.createAppointmentResourceTypeForManager,
  updateAppointmentResourceTypeForManager: mocks.updateAppointmentResourceTypeForManager,
  createAppointmentResourceOperatingWindowBatchForManager:
    mocks.createAppointmentResourceOperatingWindowBatchForManager,
  createAppointmentResourceOperatingWindowForManager:
    mocks.createAppointmentResourceOperatingWindowForManager,
  deleteAppointmentResourceOperatingWindowForManager:
    mocks.deleteAppointmentResourceOperatingWindowForManager,
  createAppointmentResourceUnavailabilityForManager:
    mocks.createAppointmentResourceUnavailabilityForManager
}));

import { POST as POSTClosure } from "@/app/api/settings/appointments/closures/route";
import { POST as POSTRecurringTemplateClosure } from "@/app/api/settings/appointments/recurring-templates/[templateCode]/closure/route";
import {
  DELETE as DELETEClosure,
  PATCH as PATCHClosure
} from "@/app/api/settings/appointments/closures/[closureId]/route";
import { PATCH as PATCHResource } from "@/app/api/settings/appointments/resources/[resourceId]/route";
import { POST as POSTResourceType } from "@/app/api/settings/appointments/resource-types/route";
import { PATCH as PATCHResourceType } from "@/app/api/settings/appointments/resource-types/[resourceTypeId]/route";
import { DELETE as DELETEResourceOperatingWindow } from "@/app/api/settings/appointments/resources/[resourceId]/operating-windows/[operatingWindowId]/route";
import { POST as POSTBulkResourceOperatingWindow } from "@/app/api/settings/appointments/resources/[resourceId]/operating-windows/bulk/route";
import { POST as POSTResourceOperatingWindow } from "@/app/api/settings/appointments/resources/[resourceId]/operating-windows/route";
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
    mocks.applyRecurringAppointmentClosureTemplateForManager.mockResolvedValue(settings);
    mocks.updateAppointmentLocationClosureForManager.mockResolvedValue(settings);
    mocks.deleteAppointmentLocationClosureForManager.mockResolvedValue(settings);
    mocks.updateAppointmentResourceForManager.mockResolvedValue(settings);
    mocks.createAppointmentResourceTypeForManager.mockResolvedValue(settings);
    mocks.updateAppointmentResourceTypeForManager.mockResolvedValue(settings);
    mocks.createAppointmentResourceOperatingWindowBatchForManager.mockResolvedValue(settings);
    mocks.createAppointmentResourceOperatingWindowForManager.mockResolvedValue(settings);
    mocks.deleteAppointmentResourceOperatingWindowForManager.mockResolvedValue(settings);
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

  it("creates location closures from recurring templates for managers", async () => {
    const payload = {
      dateIso: "2026-07-04",
      reason: "Annual holiday closure approved."
    };

    const response = await POSTRecurringTemplateClosure(
      new Request(
        "http://localhost/api/settings/appointments/recurring-templates/INDEPENDENCE_DAY/closure",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      ),
      {
        params: Promise.resolve({ templateCode: "INDEPENDENCE_DAY" })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.applyRecurringAppointmentClosureTemplateForManager).toHaveBeenCalledWith(
      managerUser,
      {
        templateCode: "INDEPENDENCE_DAY",
        ...payload
      }
    );
  });

  it("updates location closures for managers", async () => {
    const payload = {
      type: "PLANNED",
      name: "Service training",
      startsAt: "2026-07-10T14:00:00.000Z",
      endsAt: "2026-07-10T18:00:00.000Z",
      reason: "Training window extended."
    };

    const response = await PATCHClosure(
      new Request("http://localhost/api/settings/appointments/closures/closure-1", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
      {
        params: Promise.resolve({ closureId: "closure-1" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.updateAppointmentLocationClosureForManager).toHaveBeenCalledWith(
      managerUser,
      "closure-1",
      payload
    );
  });

  it("deletes location closures for managers", async () => {
    const response = await DELETEClosure(
      new Request("http://localhost/api/settings/appointments/closures/closure-1", {
        method: "DELETE"
      }),
      {
        params: Promise.resolve({ closureId: "closure-1" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.deleteAppointmentLocationClosureForManager).toHaveBeenCalledWith(
      managerUser,
      "closure-1"
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

  it("creates resource types for managers", async () => {
    const payload = {
      code: "SERVICE_BAY",
      name: "Service bay",
      kind: "SERVICE_BAY",
      defaultCapacityMode: "CAPACITY",
      defaultCapacity: 2,
      defaultConflictPolicy: "WARNING",
      visibilityClass: "OPERATIONAL"
    };

    const response = await POSTResourceType(
      new Request("http://localhost/api/settings/appointments/resource-types", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.createAppointmentResourceTypeForManager).toHaveBeenCalledWith(
      managerUser,
      payload
    );
  });

  it("updates resource type defaults for managers", async () => {
    const payload = {
      name: "Staff advisor",
      defaultCapacityMode: "CAPACITY",
      defaultCapacity: 2,
      defaultConflictPolicy: "WARNING",
      isActive: true
    };

    const response = await PATCHResourceType(
      new Request("http://localhost/api/settings/appointments/resource-types/rt-staff", {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
      {
        params: Promise.resolve({ resourceTypeId: "rt-staff" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.updateAppointmentResourceTypeForManager).toHaveBeenCalledWith(managerUser, {
      ...payload,
      resourceTypeId: "rt-staff"
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

  it("creates resource operating windows for managers", async () => {
    const payload = {
      businessDay: "MONDAY",
      opensAt: "10:00",
      closesAt: "16:00",
      capacityOverride: 1,
      validFrom: "2026-07-07",
      validTo: null,
      reason: "Limit advisor availability during training."
    };

    const response = await POSTResourceOperatingWindow(
      new Request(
        "http://localhost/api/settings/appointments/resources/res-abdi/operating-windows",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      ),
      {
        params: Promise.resolve({ resourceId: "res-abdi" })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.createAppointmentResourceOperatingWindowForManager).toHaveBeenCalledWith(
      managerUser,
      {
        ...payload,
        resourceId: "res-abdi"
      }
    );
  });

  it("creates bulk resource operating windows for managers", async () => {
    const payload = {
      businessDays: ["MONDAY", "TUESDAY", "WEDNESDAY"],
      opensAt: "09:00",
      closesAt: "17:00",
      capacityOverride: null,
      validFrom: "2026-07-07",
      validTo: null,
      replaceExisting: true,
      reason: "Apply advisor summer schedule."
    };

    const response = await POSTBulkResourceOperatingWindow(
      new Request(
        "http://localhost/api/settings/appointments/resources/res-abdi/operating-windows/bulk",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      ),
      {
        params: Promise.resolve({ resourceId: "res-abdi" })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.createAppointmentResourceOperatingWindowBatchForManager).toHaveBeenCalledWith(
      managerUser,
      {
        ...payload,
        resourceId: "res-abdi"
      }
    );
  });

  it("deletes resource operating windows for managers with a reason", async () => {
    const payload = {
      reason: "Temporary advisor calendar was replaced."
    };

    const response = await DELETEResourceOperatingWindow(
      new Request(
        "http://localhost/api/settings/appointments/resources/res-abdi/operating-windows/resource-window-1",
        {
          method: "DELETE",
          body: JSON.stringify(payload)
        }
      ),
      {
        params: Promise.resolve({
          resourceId: "res-abdi",
          operatingWindowId: "resource-window-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ settings });
    expect(mocks.deleteAppointmentResourceOperatingWindowForManager).toHaveBeenCalledWith(
      managerUser,
      {
        resourceId: "res-abdi",
        operatingWindowId: "resource-window-1",
        reason: payload.reason
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
