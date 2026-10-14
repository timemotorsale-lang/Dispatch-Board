import { beforeEach, describe, expect, it, vi } from "vitest";
import VehicleMediaEntry from "@/app/(app)/vehicles/[id]/media/page";
const mocks = vi.hoisted(() => ({ relationships: vi.fn(), gallery: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn(async () => ({ id: "staff" })) }));
vi.mock("@/server/db/client", () => ({ prisma: { vehicleRelationship: { findMany: mocks.relationships } } }));
vi.mock("@/server/vehicle-360/service", () => ({ getVehicleSalesMedia: mocks.gallery }));
const open = () => VehicleMediaEntry({ params: Promise.resolve({ id: "v1" }) });
beforeEach(() => { vi.resetAllMocks(); mocks.relationships.mockResolvedValue([]); mocks.gallery.mockResolvedValue({ vehicleId: "v1", version: 0, items: [], intakeItems: [], canManage: false }); });
describe("shared media entry", () => {
  it("routes inventory and unconfirmed acquisition photos to the inventory Media tab", async () => {
    await expect(open()).rejects.toThrow("redirect:/vehicles/v1/details?tab=media&purpose=intake");
    expect(mocks.gallery).not.toHaveBeenCalled();
  });
  it("keeps acquired trade-ins in the inventory media workspace", async () => {
    mocks.relationships.mockResolvedValue([{ relationshipType: "CUSTOMER_OWNER" }, { relationshipType: "TRADE_IN" }]);
    await expect(open()).rejects.toThrow("redirect:/vehicles/v1/details?tab=media&purpose=intake");
  });
  it("uses the same capture component for customer service, without advertising actions", async () => {
    mocks.relationships.mockResolvedValue([{ relationshipType: "SERVICE_ONLY" }]);
    const page = await open();
    const workspace = page.props.children[2];
    expect(workspace.props.intakeOnly).toBe(true);
    expect(workspace.props.initialModel.canManage).toBe(false);
    expect(mocks.gallery).toHaveBeenCalledWith({ id: "staff" }, "v1");
  });
});
