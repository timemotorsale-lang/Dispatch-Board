import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addVehicleCustodyEvent: vi.fn(),
  addVehicleExternalIdentity: vi.fn(),
  addVehicleOdometerObservation: vi.fn(),
  addVehicleRelationship: vi.fn(),
  correctRegistryVehicleColor: vi.fn(),
  getCurrentUser: vi.fn(),
  resolveVehicleDuplicate: vi.fn(),
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/vehicle-registry/service", () => ({
  addVehicleCustodyEvent: mocks.addVehicleCustodyEvent,
  addVehicleExternalIdentity: mocks.addVehicleExternalIdentity,
  addVehicleOdometerObservation: mocks.addVehicleOdometerObservation,
  addVehicleRelationship: mocks.addVehicleRelationship,
  correctRegistryVehicleColor: mocks.correctRegistryVehicleColor,
  resolveVehicleDuplicate: mocks.resolveVehicleDuplicate,
}));

import { POST } from "@/app/api/vehicles/[id]/commands/route";

const actor = { id: "advisor-1", isActive: true, roles: ["Service Advisor"] };

describe("vehicle command route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.addVehicleRelationship.mockResolvedValue({ duplicate: false, result: { id: "relationship-1" }, version: 2 });
  });

  it("keeps legacy service-intake customer links intake-safe", async () => {
    const payload = { action: "ADD_RELATIONSHIP", customerId: "customer-1", effectiveFrom: "2026-10-08T12:00:00.000Z", expectedVersion: 1, idempotencyKey: "service-link-1", locationId: "loc-1", reason: "Link the newly created service vehicle to the intake customer.", relationshipType: "SERVICE_ONLY", sourceCode: "SERVICE_INTAKE" };

    const response = await POST(new Request("http://localhost/api/vehicles/vehicle-1/commands", { method: "POST", body: JSON.stringify(payload) }), { params: Promise.resolve({ id: "vehicle-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.addVehicleRelationship).toHaveBeenCalledWith(actor, "vehicle-1", payload, { enforceRollout: false });
  });

  it("leaves ordinary relationship commands on the protected registry path", async () => {
    const payload = { action: "ADD_RELATIONSHIP", effectiveFrom: "2026-10-08T12:00:00.000Z", expectedVersion: 1, idempotencyKey: "inventory-link-1", locationId: "loc-1", reason: "Establish dealership ownership.", relationshipType: "DEALERSHIP_OWNED", sourceCode: "INVENTORY_INTAKE" };

    const response = await POST(new Request("http://localhost/api/vehicles/vehicle-1/commands", { method: "POST", body: JSON.stringify(payload) }), { params: Promise.resolve({ id: "vehicle-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.addVehicleRelationship).toHaveBeenCalledWith(actor, "vehicle-1", payload, undefined);
  });
});
