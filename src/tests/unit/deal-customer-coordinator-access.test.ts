import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({ locations: vi.fn(), grants: vi.fn(), customer: vi.fn(), list: vi.fn(), ordinaryList: vi.fn(), mode: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { userLocationAccess: { findMany: mocks.locations }, customer: { findFirst: mocks.customer } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));
vi.mock("@/server/repositories/unified-crm-customer-read-repository", () => ({ createUnifiedCrmCustomerReadRepository: () => ({ listCustomers: mocks.list }) }));
vi.mock("@/server/services/unified-crm-customer-read-service", () => ({ getUnifiedCrmCustomerList: mocks.ordinaryList, resolveUnifiedCrmCustomerReadMode: mocks.mode }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "company-a" }) }));
import { dealCustomer, searchDealCustomers } from "@/server/deal-continuity/identities";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";

const coordinator: AuthenticatedUser = { id: "coordinator", name: "Coordinator", email: "coordinator@example.test", isActive: true, roles: ["Operations Coordinator", "Office Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const customer = { id: "shared-customer", displayName: "Shared customer", customerNumber: "CUS-100", phoneNumber: "+16125550100", email: "customer@example.test", updatedAt: new Date("2026-11-03"), ssnLast4: "9999" };

describe("coordinator shared customer selection for deals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.locations.mockResolvedValue([{ locationId: "company-a-location" }]);
    mocks.grants.mockResolvedValue([]); mocks.mode.mockReturnValue("REVIEW");
    mocks.customer.mockResolvedValue(customer); mocks.list.mockResolvedValue([customer]);
  });
  it("loads masked company identities without changing general CRM ownership rules", async () => {
    const result = await searchDealCustomers(coordinator, new URLSearchParams());
    expect(requireUnifiedCrmCustomerReadPolicy(coordinator)).toEqual({ kind: "OWNER", ownerUserId: coordinator.id });
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "company-a", recordScope: { kind: "ORGANIZATION" }, status: "active", limit: 25 }));
    expect(result.items).toEqual([{ id: customer.id, name: customer.displayName, customerNumber: "CUS-100", phone: "••••0100", email: "c•••@•••" }]);
    expect(JSON.stringify(result)).not.toContain("9999");
    expect(mocks.locations).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: coordinator.id, location: { organizationId: "company-a" } }) }));
  });
  it("uses the same company boundary when selecting and saving another owner's customer", async () => {
    expect(await dealCustomer(coordinator, customer.id)).toMatchObject({ id: customer.id, name: customer.displayName });
    const where = mocks.customer.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: customer.id, organizationId: "company-a", status: "ACTIVE", mergedIntoCustomerId: null });
    expect(where).not.toHaveProperty("ownerUserId");
  });
  it("preserves salesperson ownership restrictions", async () => {
    await dealCustomer({ ...coordinator, roles: ["Salesperson"] }, customer.id);
    expect(mocks.customer).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerUserId: coordinator.id }) }));
    expect(mocks.locations).not.toHaveBeenCalled();
  });
  it("rejects missing company access, inactive users, and explicit lifecycle denial", async () => {
    mocks.locations.mockResolvedValue([]);
    await expect(dealCustomer(coordinator, customer.id)).rejects.toMatchObject({ status: 403 });
    expect(mocks.customer).not.toHaveBeenCalled();
    await expect(searchDealCustomers({ ...coordinator, isActive: false }, new URLSearchParams())).rejects.toMatchObject({ status: 401 });
    mocks.locations.mockResolvedValue([{ locationId: "company-a-location" }]);
    mocks.grants.mockResolvedValue([{ capability: "CUSTOMER_LIFECYCLE_VIEW", effect: "DENY", locationId: null, validFrom: new Date("2020-01-01"), validTo: null, constraints: {} }]);
    await expect(searchDealCustomers(coordinator, new URLSearchParams())).rejects.toMatchObject({ status: 403 });
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("rejects inaccessible IDs and disabled reads rather than returning empty success", async () => {
    mocks.customer.mockResolvedValue(null);
    await expect(dealCustomer(coordinator, "outside-company")).rejects.toMatchObject({ status: 403 });
    mocks.mode.mockReturnValue("OFF");
    await expect(searchDealCustomers(coordinator, new URLSearchParams())).rejects.toMatchObject({ status: 403 });
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("paginates without leaking an unbounded customer list", async () => {
    mocks.list.mockResolvedValue(Array.from({ length: 26 }, (_, index) => ({ ...customer, id: `customer-${index}` })));
    const first = await searchDealCustomers(coordinator, new URLSearchParams());
    expect(first.items).toHaveLength(25); expect(first.nextCursor).toBeTruthy();
    await searchDealCustomers(coordinator, new URLSearchParams({ cursor: first.nextCursor! }));
    expect(mocks.list.mock.calls.at(-1)?.[0].cursor).toMatchObject({ id: "customer-24" });
  });
});
