import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  startAddVehicleWorkflow: vi.fn(),
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/inventory-workflow-launcher/add-vehicle", () => ({ startAddVehicleWorkflow: mocks.startAddVehicleWorkflow }));

import { POST } from "@/app/api/service-intake/vehicles/route";

describe("service intake vehicle route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", roles: ["Service Advisor"] });
  });

  it("starts Add Vehicle through the intake-safe registry path", async () => {
    const payload = { addMode: "QUICK", description: "Customer repair intake.", idempotencyKey: "intake-vehicle-1" };
    mocks.startAddVehicleWorkflow.mockResolvedValue({ result: { id: "vehicle-1" }, version: 1 });

    const response = await POST(new Request("http://localhost/api/service-intake/vehicles", { method: "POST", body: JSON.stringify(payload) }));

    expect(response.status).toBe(201);
    expect(mocks.startAddVehicleWorkflow).toHaveBeenCalledWith({ id: "user-1", roles: ["Service Advisor"] }, payload, { enforceRegistryRollout: false });
  });

  it("returns a forbidden response when the staff member lacks vehicle authority", async () => {
    mocks.startAddVehicleWorkflow.mockRejectedValue(new Error("Vehicle capability required: VEHICLE_IDENTITY_CREATE."));

    const response = await POST(new Request("http://localhost/api/service-intake/vehicles", { method: "POST", body: "{}" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Vehicle capability required: VEHICLE_IDENTITY_CREATE." });
  });
});
