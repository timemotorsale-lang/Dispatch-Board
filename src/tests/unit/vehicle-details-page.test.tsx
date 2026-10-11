import { beforeEach, describe, expect, it, vi } from "vitest";
import VehicleDetailsPage from "@/app/(app)/vehicles/[id]/details/page";

const mocks = vi.hoisted(() => ({ relationships: vi.fn(), journey: vi.fn(), pricing: vi.fn(), costs: vi.fn(), media: vi.fn(), intake: vi.fn(), gallery: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn(async () => ({ id: "staff" })) }));
vi.mock("@/server/db/client", () => ({ prisma: { vehicleRelationship: { findMany: mocks.relationships } } }));
vi.mock("@/server/inventory-unit/journey-service", () => ({ getVehicleJourney: mocks.journey }));
vi.mock("@/server/inventory-unit/service", () => ({ getVehiclePricing: mocks.pricing, getVehicleCosts: mocks.costs }));
vi.mock("@/server/vehicle-360/service", () => ({ getVehicle360: mocks.media, getVehicleSalesMedia: mocks.gallery }));
vi.mock("@/server/inventory-unit/intake-service", () => ({ getVehicleIntake: mocks.intake }));
vi.mock("@/features/inventory/frontline-preparation-workspace", () => ({ FrontlinePreparationWorkspace: () => null }));

const open = () => VehicleDetailsPage({ params: Promise.resolve({ id: "v1" }) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.relationships.mockResolvedValue([{ relationshipType: "DEALERSHIP_OWNED" }]);
  mocks.journey.mockResolvedValue({ vehicle: { id: "v1" }, unit: null, intake: { status: "DRAFT" }, access: { inventory: true, costs: false, pricing: false }, blocked: true });
  mocks.media.mockResolvedValue({ tabs: { documents: { allowed: false, items: [] }, specifications: { specifications: {} } }, timeline: [] });
  mocks.intake.mockResolvedValue(null);
  mocks.gallery.mockResolvedValue({ items: [], canManage: false });
});
describe("inventory vehicle detail landing", () => {
  it("opens the same tabbed workspace before confirmed intake, without a cycle, and while held", async () => {
    const page = await open();
    expect(page.props.journey.intake.status).toBe("DRAFT");
    expect(page.props.journey.blocked).toBe(true);
    expect(page.props.salesMedia.items).toEqual([]);
    expect(mocks.pricing).not.toHaveBeenCalled();
    expect(mocks.costs).not.toHaveBeenCalled();
  });
  it("retains the inventory view permission gate", async () => {
    mocks.journey.mockResolvedValue({ access: { inventory: false } });
    await expect(open()).rejects.toThrow("Inventory access is required");
    expect(mocks.gallery).not.toHaveBeenCalled();
  });
  it.each(["CUSTOMER_OWNER", "SOLD_TO_CUSTOMER", "SERVICE_ONLY"])("keeps %s vehicles in service rather than inventory", async relationshipType => {
    mocks.relationships.mockResolvedValue([{ relationshipType }]);
    await expect(open()).rejects.toThrow("redirect:/vehicles/v1/workbench");
    expect(mocks.journey).not.toHaveBeenCalled();
  });
  it("keeps an acquired trade-in in inventory even when customer history exists", async () => {
    mocks.relationships.mockResolvedValue([{ relationshipType: "CUSTOMER_OWNER" }, { relationshipType: "TRADE_IN" }]);
    expect((await open()).props.journey.vehicle.id).toBe("v1");
  });
  it("returns not found for a missing vehicle", async () => {
    mocks.journey.mockResolvedValue(null);
    await expect(open()).rejects.toThrow("not-found");
  });
});
