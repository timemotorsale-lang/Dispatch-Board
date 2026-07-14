import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), createRegistryVehicle: vi.fn(), listVehicleRegistry: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/vehicle-registry/service", () => ({ createRegistryVehicle: mocks.createRegistryVehicle, listVehicleRegistry: mocks.listVehicleRegistry }));
import { GET, POST } from "@/app/api/vehicles/route";

const actor = { id: "manager", isActive: true, roles: ["General Manager"] };
describe("vehicle registry route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue(actor); });
  it("passes paginated search to the protected registry service", async () => {
    mocks.listVehicleRegistry.mockResolvedValue({ items: [], page: 2, pageSize: 10, total: 0, totalPages: 1 });
    const response = await GET(new Request("http://localhost/api/vehicles?query=Honda&page=2&pageSize=10"));
    expect(response.status).toBe(200); expect(mocks.listVehicleRegistry).toHaveBeenCalledWith(actor, { page: "2", pageSize: "10", query: "Honda" });
  });
  it("returns 201 for a new idempotent create and 200 for a replay", async () => {
    const payload = { vehicleNumber: "TMS-1" }; mocks.createRegistryVehicle.mockResolvedValueOnce({ duplicate: false, result: { id: "vehicle-1" }, version: 1 }).mockResolvedValueOnce({ duplicate: true, result: { id: "vehicle-1" }, version: 1 });
    const first = await POST(new Request("http://localhost/api/vehicles", { method: "POST", body: JSON.stringify(payload) })); const replay = await POST(new Request("http://localhost/api/vehicles", { method: "POST", body: JSON.stringify(payload) }));
    expect(first.status).toBe(201); expect(replay.status).toBe(200);
  });
  it("maps capability failures to forbidden", async () => {
    mocks.listVehicleRegistry.mockRejectedValue(new Error("Vehicle capability required: VEHICLE_OPERATIONS_VIEW (CAPABILITY_REQUIRED)."));
    const response = await GET(new Request("http://localhost/api/vehicles")); expect(response.status).toBe(403);
  });
});
