import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createInventoryUnit: vi.fn(), getCurrentUser: vi.fn(), listInventoryUnits: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/inventory-unit/service", () => ({ createInventoryUnit: mocks.createInventoryUnit, listInventoryUnits: mocks.listInventoryUnits }));
import { GET, POST } from "@/app/api/inventory-units/route";
describe("inventory unit route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue({ id: "manager" }); });
  it("passes pagination and filters to the protected service", async () => { mocks.listInventoryUnits.mockResolvedValue({ items: [], total: 0 }); const response = await GET(new Request("http://localhost/api/inventory-units?query=INV&page=2&state=BLOCKED")); expect(response.status).toBe(200); expect(mocks.listInventoryUnits).toHaveBeenCalledWith({ id: "manager" }, expect.objectContaining({ page: "2", query: "INV", state: "BLOCKED" })); });
  it("returns created and replay status codes", async () => { mocks.createInventoryUnit.mockResolvedValueOnce({ duplicate: false, result: { id: "one" }, version: 1 }).mockResolvedValueOnce({ duplicate: true, result: { id: "one" }, version: 1 }); const request = () => new Request("http://localhost/api/inventory-units", { method: "POST", body: "{}" }); expect((await POST(request())).status).toBe(201); expect((await POST(request())).status).toBe(200); });
  it("maps capability failures to forbidden", async () => { mocks.listInventoryUnits.mockRejectedValue(new Error("Vehicle capability required: INVENTORY_UNIT_VIEW (CAPABILITY_REQUIRED).")); expect((await GET(new Request("http://localhost/api/inventory-units"))).status).toBe(403); });
});
