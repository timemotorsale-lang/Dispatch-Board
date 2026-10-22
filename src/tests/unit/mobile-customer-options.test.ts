import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({ locations: vi.fn(), grants: vi.fn(), user: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { location: { findMany: mocks.locations } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
import { getServiceIntakeCustomerOptions } from "@/server/service-intake/customer-service";
import { GET } from "@/app/api/service-intake/customers/options/route";

const manager: AuthenticatedUser = { id: "test-manager", name: "Test manager", email: "test@example.invalid", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.locations.mockResolvedValue([{ id: "allowed-location", name: "Test location" }, { id: "denied-location", name: "Other location" }]);
  mocks.grants.mockResolvedValue([]); mocks.user.mockResolvedValue(manager);
});

describe("mobile customer location boundary", () => {
  it("requires authentication before reading locations or grants", async () => {
    await expect(getServiceIntakeCustomerOptions(null)).rejects.toThrow("Authentication required.");
    expect(mocks.locations).not.toHaveBeenCalled(); expect(mocks.grants).not.toHaveBeenCalled();
  });
  it("returns only locations permitted by the existing capability policy", async () => {
    mocks.grants.mockResolvedValue([{ capability: "CUSTOMER_INTAKE_CREATE", effect: "DENY", locationId: "denied-location", validFrom: new Date("2020-01-01"), validTo: null }]);
    expect((await getServiceIntakeCustomerOptions(manager)).locations.map((location) => location.id)).toEqual(["allowed-location"]);
    expect(mocks.locations.mock.calls[0][0].where.organizationId).toBeTruthy();
  });
  it("does not offer creation locations to an inactive account", async () => {
    expect((await getServiceIntakeCustomerOptions({ ...manager, isActive: false })).locations).toEqual([]);
  });
  it("marks location responses non-cacheable", async () => {
    const response = await GET();
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("returns 401 for an expired session", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
  it("does not expose database diagnostics to the client", async () => {
    mocks.locations.mockRejectedValue(new Error("private_database_connection_details"));
    const response = await GET();
    expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain("private_database");
  });
});
