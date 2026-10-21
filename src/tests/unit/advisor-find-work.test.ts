import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { findAdvisorWork } from "@/server/advisor-workspace/find-work";

vi.mock("@/server/repair-order/service", () => ({ getRepairOrderCreateOptions: vi.fn(), listRepairOrders: vi.fn() }));
vi.mock("@/server/inventory-unit/intake-service", () => ({ getVehicleIntake: vi.fn() }));
const actor = { id: "advisor" } as AuthenticatedUser;
const vehicle = { id: "vehicle-1", vin: "3FA6P0K91HR406095", stockNumber: "406095", vehicleNumber: "V1", year: 2017, make: "Ford", model: "Fusion" };
function fixture() {
  const options = vi.fn().mockResolvedValue({ vehicles: [vehicle], inventoryUnits: [] });
  const orders = vi.fn().mockResolvedValue({ items: [], total: 0 });
  const intake = vi.fn().mockResolvedValue({ unit: null });
  return { options, orders, intake };
}
function dependencies(input: ReturnType<typeof fixture>) { return input as unknown as NonNullable<Parameters<typeof findAdvisorWork>[2]>; }

describe("direct advisor find work", () => {
  it("opts into the review workbench for open ROs and reuses inventory through compact intake otherwise", async () => {
    const input = fixture(); input.intake.mockResolvedValue({ unit: { id: "unit" } });
    expect((await findAdvisorWork(actor, vehicle.vin, { ...dependencies(input), reviewWorkflow: true })).matches[0].href).toBe("/prototype/inventory-intake?vehicleId=vehicle-1&advisor=1&reviewWorkbench=1");
    input.orders.mockResolvedValue({ items: [{ id: "ro", repairOrderNumber: "RO-1", closedAt: null, vehicle }] });
    expect((await findAdvisorWork(actor, vehicle.vin, { ...dependencies(input), reviewWorkflow: true })).matches[0].href).toBe("/prototype/repair-workbench?repairOrderId=ro");
  });
  it("opens existing inventory planning without creating records", async () => {
    const input = fixture(); input.intake.mockResolvedValue({ unit: { id: "unit" } });
    expect((await findAdvisorWork(actor, " 406095 ", dependencies(input))).matches).toEqual([{ label: expect.any(String), href: "/vehicles/vehicle-1/inventory-planning" }]);
    expect(input.orders).toHaveBeenCalledWith(actor, expect.objectContaining({ vehicleId: vehicle.id }));
  });
  it("carries canonical identity into compact intake when no inventory unit exists", async () => {
    const result = await findAdvisorWork(actor, vehicle.vin.toLowerCase(), dependencies(fixture()));
    expect(result.matches[0].href).toBe("/prototype/inventory-intake?vehicleId=vehicle-1&advisor=1");
  });
  it("opens an existing customer or recon RO directly without requiring dealership inventory", async () => {
    const input = fixture(); input.orders.mockResolvedValue({ items: [{ id: "ro", repairOrderNumber: "RO-1", closedAt: null, vehicle }] });
    expect((await findAdvisorWork(actor, vehicle.vin, dependencies(input))).matches[0].href).toContain("/vehicles/shop-planning?repairOrderId=ro&");
    expect(input.intake).not.toHaveBeenCalled();
  });
  it("offers a choice rather than silently picking one of multiple open orders", async () => {
    const input = fixture(); input.orders.mockResolvedValue({ items: ["one", "two"].map(id => ({ id, repairOrderNumber: id, vehicle, closedAt: null })) });
    expect((await findAdvisorWork(actor, "406095", dependencies(input))).matches).toHaveLength(2);
  });
  it("does not route to closed work or leak a denied intake", async () => {
    const input = fixture(); input.orders.mockResolvedValue({ items: [{ id: "closed", closedAt: new Date() }] }); input.intake.mockRejectedValue(new Error("Private details"));
    const result = await findAdvisorWork(actor, vehicle.vin, dependencies(input));
    expect(result.matches).toEqual([]); expect(result.message).not.toContain("Private");
  });
  it("prefills a new valid VIN but does not invent inventory for arbitrary search text", async () => {
    const input = fixture(); input.options.mockResolvedValue({ vehicles: [], inventoryUnits: [] });
    expect((await findAdvisorWork(actor, vehicle.vin, dependencies(input))).matches[0].href).toContain(`vin=${vehicle.vin}&advisor=1`);
    expect((await findAdvisorWork(actor, "no such car", dependencies(input))).matches).toEqual([]);
    expect((await findAdvisorWork(actor, "", dependencies(input))).matches).toEqual([]);
  });
});
