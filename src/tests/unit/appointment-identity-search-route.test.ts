import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), options: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderCreateOptions: mocks.options }));
import { GET } from "@/app/api/appointments/identity-search/route";

describe("appointment canonical identity lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ id: "staff-1" });
    mocks.options.mockResolvedValue({ customers: [{ id: "customer-1", displayName: "Review Customer", customerNumber: "C-1" }], vehicles: [{ id: "vehicle-1", vehicleNumber: "V-1", stockNumber: "004352", make: "Honda", model: "Accord" }] });
  });
  it("resolves the exact customer ID passed from CRM instead of guessing from names", async () => {
    const response = await GET(new Request("http://localhost/api/appointments/identity-search?query=customer-1"));
    expect(await response.json()).toMatchObject({ customers: [{ id: "customer-1" }] });
  });
  it("can search the existing vehicle independently of the customer", async () => {
    const response = await GET(new Request("http://localhost/api/appointments/identity-search?query=004352"));
    expect(await response.json()).toMatchObject({ customers: [], vehicles: [{ id: "vehicle-1" }] });
  });
  it("preserves the underlying identity access policy", async () => {
    mocks.options.mockRejectedValueOnce(new Error("Vehicle capability required: REPAIR_ORDER_VIEW"));
    expect((await GET(new Request("http://localhost/api/appointments/identity-search?query=customer-1"))).status).toBe(403);
  });
});
