import { describe, expect, it, vi } from "vitest";
import InventoryToFrontlinePage from "@/app/(app)/vehicles/inventory-to-frontline/page";
import { listFrontlineWorkflows } from "@/server/inventory-frontline/service";

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn(async () => ({ id: "staff" })) }));
vi.mock("@/server/inventory-frontline/service", () => ({
  listFrontlineWorkflows: vi.fn(async () => ({ items: [] })),
  getFrontlineOptions: vi.fn(async () => ({ users: [], units: [{ id: "u1", vehicle: { id: "v1" } }, { id: "u2", vehicle: { id: "v2" } }] }))
}));

describe("frontline preparation vehicle context", () => {
  it("scopes release workflows and creation options to the selected vehicle", async () => {
    const page = await InventoryToFrontlinePage({ searchParams: Promise.resolve({ vehicleId: "v2" }) });
    expect(listFrontlineWorkflows).toHaveBeenLastCalledWith({ id: "staff" }, { vehicleId: "v2" });
    expect(page.props.options.units).toEqual([{ id: "u2", vehicle: { id: "v2" } }]);
  });
  it("retains the complete workflow view without a vehicle filter", async () => {
    const page = await InventoryToFrontlinePage({});
    expect(page.props.options.units).toHaveLength(2);
  });
});
