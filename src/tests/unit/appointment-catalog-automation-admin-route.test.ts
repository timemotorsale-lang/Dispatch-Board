import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAppointmentCatalogAutomationAdminForManager: vi.fn(),
  simulateAppointmentCatalogAutomationForManager: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-catalog-automation-admin", () => ({
  getAppointmentCatalogAutomationAdminForManager:
    mocks.getAppointmentCatalogAutomationAdminForManager,
  simulateAppointmentCatalogAutomationForManager:
    mocks.simulateAppointmentCatalogAutomationForManager
}));

import { GET } from "@/app/api/settings/appointments/catalog/route";
import { POST } from "@/app/api/settings/appointments/catalog/simulate/route";

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

const catalog = {
  purposes: [{ code: "APT-TEST-DRIVE", name: "Test Drive" }],
  catalogs: {
    outcomeCodes: ["COMPLETED"],
    followUpDispositionCodes: ["NO_FOLLOW_UP_REQUIRED"],
    reasonCodes: ["AUTOMATION_SIMULATED"]
  },
  automationRules: [],
  governance: {
    purposeCount: 1
  }
};

const simulation = {
  purpose: {
    code: "APT-TEST-DRIVE",
    name: "Test Drive"
  },
  actions: {
    generatedTaskActions: [],
    generatedAppointmentAction: null
  }
};

describe("appointment catalog automation admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.getAppointmentCatalogAutomationAdminForManager.mockResolvedValue(catalog);
    mocks.simulateAppointmentCatalogAutomationForManager.mockResolvedValue(simulation);
  });

  it("loads the catalog automation admin model for managers", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ catalog });
    expect(mocks.getAppointmentCatalogAutomationAdminForManager).toHaveBeenCalledWith(
      managerUser
    );
  });

  it("runs automation simulation for managers", async () => {
    const payload = {
      purposeCode: "APT-TEST-DRIVE",
      outcomeCode: "COMPLETED",
      followUpDispositionCode: "NO_FOLLOW_UP_REQUIRED"
    };
    const response = await POST(
      new Request("http://localhost/api/settings/appointments/catalog/simulate", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ simulation });
    expect(mocks.simulateAppointmentCatalogAutomationForManager).toHaveBeenCalledWith(
      managerUser,
      payload
    );
  });

  it("rejects malformed simulation payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/settings/appointments/catalog/simulate", {
        method: "POST",
        body: JSON.stringify({ purposeCode: "APT-TEST-DRIVE" })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Purpose, outcome, and follow-up disposition are required."
    });
    expect(mocks.simulateAppointmentCatalogAutomationForManager).not.toHaveBeenCalled();
  });

  it("maps manager access failures to 403", async () => {
    mocks.getAppointmentCatalogAutomationAdminForManager.mockRejectedValue(
      new Error("Manager access required.")
    );

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Manager access required."
    });
  });
});
