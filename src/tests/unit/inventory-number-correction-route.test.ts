import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { InventoryNumberCorrectionError } from "@/server/inventory-unit/number-correction-service";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), correct: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/server/inventory-unit/number-correction-service", async importOriginal => ({ ...await importOriginal<typeof import("@/server/inventory-unit/number-correction-service")>(), correctInventoryUnitNumber: mocks.correct }));
import { PATCH } from "@/app/api/inventory-units/[id]/number/route";

describe("inventory number correction PATCH", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.currentUser.mockResolvedValue({ id: "actor" }); });
  const send = () => PATCH(new Request("http://localhost/api/inventory-units/unit/number", { method: "PATCH", body: JSON.stringify({ inventoryNumber: "NEW", expectedVersion: 3, idempotencyKey: "key", reason: "Correct number" }) }), { params: Promise.resolve({ id: "unit" }) });

  it("returns the correction contract", async () => {
    const result = { id: "unit", inventoryNumber: "NEW", version: 4 };
    mocks.correct.mockResolvedValue(result);
    const response = await send();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(mocks.correct).toHaveBeenCalledWith({ id: "actor" }, "unit", expect.objectContaining({ inventoryNumber: "NEW", expectedVersion: 3 }));
  });

  it.each([
    [new InventoryNumberCorrectionError("Reason too short"), 400],
    [new Error("Authentication required."), 401],
    [new Error("Vehicle capability required: INVENTORY_UNIT_VIEW"), 403],
    [new InventoryNumberCorrectionError("Not found", 404), 404],
    [new EnterpriseCommandConflictError("Reload inventory", "VERSION_CONFLICT"), 409],
    [new InventoryNumberCorrectionError("Number in use", 409), 409],
  ])("maps expected failure %s", async (error, status) => {
    mocks.correct.mockRejectedValue(error);
    expect((await send()).status).toBe(status);
  });

  it("sanitizes Prisma and other unexpected failures", async () => {
    mocks.correct.mockRejectedValue(Object.assign(new Error("Invalid prisma.inventoryUnit.update() database credentials internal SQL"), { code: "P2002" }));
    const response = await send();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Inventory number correction failed. Reload and try again." });
  });
});
