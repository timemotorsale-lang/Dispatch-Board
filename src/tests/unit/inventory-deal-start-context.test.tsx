import { beforeEach, describe, expect, it, vi } from "vitest";
import DealStartPage from "@/app/(app)/crm-next/deals/start/page";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { resolveCrmNextAccess } from "@/server/crm-next/access";

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn(async () => ({ id: "staff" })) }));
vi.mock("@/server/crm-next/access", () => ({ resolveCrmNextAccess: vi.fn(() => ({ allowed: true })) }));
vi.mock("@/server/crm-next/read-model", () => ({ getCrmNextOperationalCommandCenter: vi.fn(async () => ({ customers: [] })) }));
vi.mock("@/features/crm-next/crm-next-shell", () => ({ CrmNextDealStartView: () => null, CrmNextUnavailable: () => null }));
vi.mock("@/server/inventory-unit/journey-service", () => ({ getVehicleJourney: vi.fn(async () => ({ vehicle: { id: "vehicle-1", year: 2024, make: "Toyota", model: "RAV4", vin: "VIN123", stockNumber: "333586" } })) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

describe("inventory Start Deal handoff", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("resolves the selected vehicle through the authorized journey service", async () => {
    const page = await DealStartPage({ searchParams: Promise.resolve({ vehicleId: "vehicle-1", pathway: "retail-sale" }) });
    expect(getVehicleJourney).toHaveBeenCalledWith({ id: "staff" }, "vehicle-1");
    expect(page.props.initialVehicleReference).toBe("2024 / Toyota / RAV4 / VIN123 / 333586");
    expect(page.props.initialWorkflowId).toBe("retail-sale");
    expect(page.props.initialVehicleFacts).toEqual({ year: "2024", make: "Toyota", model: "RAV4", vin: "VIN123", stockNumber: "333586" });
  });
  it("preserves ordinary deal entry without a vehicle parameter", async () => {
    const page = await DealStartPage({});
    expect(getVehicleJourney).not.toHaveBeenCalled();
    expect(page.props.initialVehicleReference).toBeUndefined();
  });
  it("does not reveal vehicle context to denied CRM users", async () => {
    vi.mocked(resolveCrmNextAccess).mockReturnValueOnce({ allowed: false, reason: "Denied", fallbackHref: "/vehicles" } as ReturnType<typeof resolveCrmNextAccess>);
    await DealStartPage({ searchParams: Promise.resolve({ vehicleId: "vehicle-1" }) });
    expect(getVehicleJourney).not.toHaveBeenCalled();
  });
  it("does not substitute another vehicle for an unknown ID", async () => {
    vi.mocked(getVehicleJourney).mockResolvedValueOnce(null);
    await expect(DealStartPage({ searchParams: Promise.resolve({ vehicleId: "missing" }) })).rejects.toThrow("NOT_FOUND");
  });
});
