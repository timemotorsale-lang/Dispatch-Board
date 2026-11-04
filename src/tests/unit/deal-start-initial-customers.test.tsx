import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), model: vi.fn(), customers: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.user }));
vi.mock("@/server/crm-next/read-model", () => ({ getCrmNextOperationalCommandCenter: mocks.model }));
vi.mock("@/server/deal-continuity/identities", () => ({ searchDealCustomers: mocks.customers }));
vi.mock("@/server/inventory-unit/journey-service", () => ({ getVehicleJourney: vi.fn() }));
vi.mock("@/features/crm-next/crm-next-shell", () => ({ CrmNextDealStartView: () => null, CrmNextUnavailable: () => null }));
import Page from "@/app/(app)/crm-next/deals/start/page";

const actor = { id: "coordinator", name: "Coordinator", email: "coordinator@example.test", isActive: true, roles: ["Operations Coordinator", "Office Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const list = { items: [{ id: "shared-customer", name: "Shared prospect", customerNumber: "CUS-501", phone: "••••1234", email: "" }], nextCursor: "next-page" };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("CRM_NEXT", "DOGFOOD");
  mocks.user.mockResolvedValue(actor); mocks.model.mockResolvedValue({ customers: [], userId: actor.id }); mocks.customers.mockResolvedValue(list);
});
afterEach(() => vi.unstubAllEnvs());
describe("initial deal customer list", () => {
  it("loads company identities with the page even when the coordinator's preview has no customers", async () => {
    const page = await Page();
    expect(page.props.initialCustomerList).toEqual(list);
    expect(page.props.model.customers).toEqual([]);
    expect(mocks.customers).toHaveBeenCalledWith(actor, new URLSearchParams());
  });
  it("uses the same loader for managers", async () => {
    mocks.user.mockResolvedValue({ ...actor, roles: ["General Manager"] });
    expect((await Page()).props.initialCustomerList).toEqual(list);
  });
  it("retains the page and provides a retry error when loading customers fails", async () => {
    mocks.customers.mockRejectedValue(new Error("Unavailable source"));
    expect((await Page()).props.initialCustomerList).toMatchObject({ items: [], nextCursor: null, error: expect.stringContaining("Find customer to retry") });
  });
  it("does not load customer identities when CRM is disabled", async () => {
    vi.stubEnv("CRM_NEXT", "OFF"); await Page();
    expect(mocks.customers).not.toHaveBeenCalled();
  });
});
