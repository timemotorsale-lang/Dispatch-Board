import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addVehicleRelationship: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/vehicle-registry/service", () => ({ addVehicleRelationship: mocks.addVehicleRelationship }));

import { POST } from "@/app/api/service-intake/vehicles/[id]/relationship/route";

const actor = { id: "advisor-1", isActive: true, roles: ["Service Advisor"] };
const payload = {
  customerId: "customer-1",
  effectiveFrom: "2026-10-08T12:00:00.000Z",
  expectedVersion: 1,
  idempotencyKey: "relationship-1",
  locationId: "loc-1",
  reason: "Link the newly created service vehicle to the intake customer.",
  relationshipType: "SERVICE_ONLY",
  sourceCode: "SERVICE_INTAKE",
};

describe("service intake vehicle relationship route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.addVehicleRelationship.mockResolvedValue({ duplicate: false, result: { id: "relationship-1" }, version: 2 });
  });

  it("links service-intake customer vehicles without requiring the registry rollout gate", async () => {
    const response = await POST(new Request("http://localhost/api/service-intake/vehicles/vehicle-1/relationship", { method: "POST", body: JSON.stringify(payload) }), { params: Promise.resolve({ id: "vehicle-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.addVehicleRelationship).toHaveBeenCalledWith(actor, "vehicle-1", payload, { enforceRollout: false });
  });

  it("rejects non-service relationship commands", async () => {
    const response = await POST(new Request("http://localhost/api/service-intake/vehicles/vehicle-1/relationship", { method: "POST", body: JSON.stringify({ ...payload, relationshipType: "DEALERSHIP_OWNED" }) }), { params: Promise.resolve({ id: "vehicle-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Service intake can only add a service-only customer relationship." });
    expect(mocks.addVehicleRelationship).not.toHaveBeenCalled();
  });
});
