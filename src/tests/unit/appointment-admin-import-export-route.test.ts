import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createAppointmentAdminConfigurationExportForManager: vi.fn(),
  previewAppointmentAdminConfigurationImportForManager: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-admin-import-export", () => ({
  createAppointmentAdminConfigurationExportForManager:
    mocks.createAppointmentAdminConfigurationExportForManager,
  previewAppointmentAdminConfigurationImportForManager:
    mocks.previewAppointmentAdminConfigurationImportForManager
}));

import { GET } from "@/app/api/settings/appointments/configuration/export/route";
import { POST } from "@/app/api/settings/appointments/configuration/import-preview/route";

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

const exportPackage = {
  schemaVersion: "appointment-admin-configuration/v1",
  packageType: "APPOINTMENT_ADMIN_CONFIGURATION",
  manifest: {
    purposeCount: 1
  }
};

const preview = {
  canApply: false,
  applySupported: false,
  validation: {
    isValidPackage: true,
    errors: [],
    warnings: []
  }
};

describe("appointment admin import/export routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.createAppointmentAdminConfigurationExportForManager.mockResolvedValue(exportPackage);
    mocks.previewAppointmentAdminConfigurationImportForManager.mockResolvedValue(preview);
  });

  it("exports appointment admin configuration through the protected service", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ exportPackage });
    expect(mocks.createAppointmentAdminConfigurationExportForManager).toHaveBeenCalledWith(
      managerUser
    );
  });

  it("previews appointment admin configuration imports through the protected service", async () => {
    const payload = {
      packageSnapshot: exportPackage,
      reason: "Review package before import."
    };
    const response = await POST(
      new Request("http://localhost/api/settings/appointments/configuration/import-preview", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ preview });
    expect(mocks.previewAppointmentAdminConfigurationImportForManager).toHaveBeenCalledWith(
      managerUser,
      payload
    );
  });

  it("rejects malformed import preview payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/settings/appointments/configuration/import-preview", {
        method: "POST",
        body: JSON.stringify({ reason: "Missing package." })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Import package snapshot and preview reason are required."
    });
    expect(mocks.previewAppointmentAdminConfigurationImportForManager).not.toHaveBeenCalled();
  });

  it("maps manager access failures to 403", async () => {
    mocks.createAppointmentAdminConfigurationExportForManager.mockRejectedValue(
      new Error("Manager access required.")
    );

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Manager access required."
    });
  });
});
