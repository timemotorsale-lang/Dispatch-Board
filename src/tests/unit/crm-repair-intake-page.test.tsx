import { beforeEach, describe, expect, it, vi } from "vitest";
import RepairOrderPage from "@/app/(app)/vehicles/repair-orders/page";

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: vi.fn(async () => ({ id: "advisor" })) }));
vi.mock("@/server/auth/navigation", () => ({ getWorkspaceKey: () => "ADVISOR" }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: (href: string) => { throw new Error(`REDIRECT:${href}`); } }));
vi.mock("@/features/inventory/service-intake-workspace", () => ({ ServiceIntakeWorkspace: () => null }));
vi.mock("@/features/inventory/repair-order-core-workspace", () => ({ RepairOrderCoreWorkspace: () => null }));
vi.mock("@/server/repair-order/service", () => ({ listRepairOrders: vi.fn(async () => ({ items: [], total: 0 })), getRepairOrderCreateOptions: vi.fn(async () => ({ customers: [{ id: "customer" }], vehicles: [{ id: "vehicle" }], locations: [] })) }));

describe("CRM repair intake page", () => {
  beforeEach(() => vi.clearAllMocks());
  it("passes authorized shared context to intake rather than creating an RO on navigation", async () => {
    const page = await RepairOrderPage({ searchParams: Promise.resolve({ intakeSource: "WALK_IN", customerId: "customer", vehicleId: "vehicle", concernSummary: "Inspect brakes", returnTo: "/crm-next/deals/start?draftId=draft" }) });
    expect(page.props).toMatchObject({ initialCustomerId: "customer", initialVehicleId: "vehicle", initialConcernSummary: "Inspect brakes", initialVehicleRelationship: "CUSTOMER_VEHICLE", returnTo: "/crm-next/deals/start?draftId=draft" });
  });
  it.each([{ customerId: "foreign", vehicleId: "vehicle" }, { customerId: "customer", vehicleId: "foreign" }])("rejects unavailable canonical identities", async context => {
    await expect(RepairOrderPage({ searchParams: Promise.resolve({ ...context, intakeSource: "WALK_IN" }) })).rejects.toThrow("NOT_FOUND");
  });
});
