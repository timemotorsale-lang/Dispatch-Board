import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ create: vi.fn(), customer: vi.fn(), locations: vi.fn(), grants: vi.fn(), list: vi.fn(), listService: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { customer: { findFirst: mocks.customer }, userLocationAccess: { findMany: mocks.locations } } }));
vi.mock("@/server/service-intake/customer-service", () => ({ createServiceIntakeCustomer: mocks.create }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));
vi.mock("@/server/repositories/unified-crm-customer-read-repository", () => ({ createUnifiedCrmCustomerReadRepository: () => ({ listCustomers: mocks.list }) }));
vi.mock("@/server/services/unified-crm-customer-read-service", async importOriginal => ({ ...await importOriginal<typeof import("@/server/services/unified-crm-customer-read-service")>(), getUnifiedCrmCustomerList: mocks.listService }));
import { createDealCustomer, searchDealCustomers } from "@/server/deal-continuity/identities";
import { dealIdentityFailure } from "@/server/deal-continuity/http";
const actor: AuthenticatedUser = { id: "coordinator", name: "Coordinator", email: "coordinator@example.test", isActive: true, roles: ["Operations Coordinator"], duties: { direct: [], roleDefaults: [], all: [] } };
describe("shared deal customer match recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv("DOCUMENT_LIBRARY_ORGANIZATION_ID", "test-organization");
    mocks.create.mockResolvedValue({ duplicate: true, customer: { id: "existing-customer" } });
    mocks.customer.mockResolvedValue({ id: "existing-customer", displayName: "Existing Customer", customerNumber: "CUS-1234", phoneNumber: "+16125550100", email: "customer@example.test", address: "Private address", idLast4: "1234", dateOfBirth: new Date("1990-01-01") });
    mocks.locations.mockResolvedValue([{ locationId: "lot" }]); mocks.grants.mockResolvedValue([]);
    mocks.list.mockResolvedValue([]); mocks.listService.mockResolvedValue({ items: [], page: { nextCursor: null } });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("gives an authorized operations coordinator an explicit existing-customer selection", async () => {
    const error = await createDealCustomer(actor, { displayName: "Customer", phoneNumber: "612 555 0100", locationId: "lot" }).catch(error => error);
    const response = dealIdentityFailure(error), body = await response.json();
    expect(response.status).toBe(409);
    expect(body).toMatchObject({ code: "CUSTOMER_MATCH_REQUIRES_SELECTION", matches: [{ id: "existing-customer", name: "Existing Customer", phone: "••••0100" }] });
    expect(JSON.stringify(body)).not.toMatch(/Private address|1990|customer@example.test|idLast4|dealPrefill/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.customer.mock.calls[0][0].where).toMatchObject({ organizationId: "test-organization", mergedIntoCustomerId: null });
  });
  it("does not reveal an inaccessible matching customer or transfer ownership", async () => {
    mocks.customer.mockResolvedValue(null);
    const error = await createDealCustomer({ ...actor, roles: ["Salesperson"] }, { displayName: "Customer", locationId: "lot" }).catch(error => error);
    const response = dealIdentityFailure(error), body = await response.json();
    expect(body.error).toContain("manager"); expect(body.matches).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("existing-customer");
    expect(mocks.customer.mock.calls[0][0].where.ownerUserId).toBe(actor.id);
  });
  it("still saves genuinely new customers normally", async () => {
    mocks.create.mockResolvedValue({ duplicate: false, customer: { id: "existing-customer" } });
    expect(await createDealCustomer(actor, { displayName: "Customer", locationId: "lot" })).toMatchObject({ id: "existing-customer", name: "Existing Customer" });
  });
  it("rejects unauthenticated creation before consulting duplicate records", async () => {
    await expect(createDealCustomer(null, {})).rejects.toMatchObject({ status: 401 });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.customer).not.toHaveBeenCalled();
  });
  it("checks coordinator location access before creating a record she cannot select", async () => {
    mocks.locations.mockResolvedValue([]);
    await expect(createDealCustomer(actor, { displayName: "Customer", locationId: "lot" })).rejects.toMatchObject({ status: 403 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("respects explicit customer-lifecycle capability denials", async () => {
    mocks.grants.mockResolvedValue([{ capability: "CUSTOMER_LIFECYCLE_VIEW", effect: "DENY", locationId: "lot", validFrom: new Date("2020-01-01"), validTo: null, constraints: {} }]);
    await expect(createDealCustomer(actor, { displayName: "Customer", locationId: "lot" })).rejects.toMatchObject({ status: 403 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses enabled CRM Next lookup for managers even when the legacy production reader is off", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CRM_NEXT", "REVIEW"); vi.stubEnv("UNIFIED_CRM_CUSTOMER_READ_MODE", "OFF");
    await searchDealCustomers({ ...actor, roles: ["General Manager"] }, new URLSearchParams({ q: "Existing Customer" }));
    expect(mocks.listService.mock.calls[0][2]).toEqual({ readMode: "REVIEW" });
  });
  it("lets authorized coordinators find shared customers in their operational company", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CRM_NEXT", "REVIEW"); vi.stubEnv("UNIFIED_CRM_CUSTOMER_READ_MODE", "OFF");
    expect(await searchDealCustomers(actor, new URLSearchParams({ q: "Existing" }))).toEqual({ items: [], nextCursor: null });
    expect(mocks.list.mock.calls[0][0]).toMatchObject({ organizationId: "test-organization", recordScope: { kind: "ORGANIZATION" }, viewerUserId: actor.id });
  });
  it("does not override disabled legacy reads when CRM Next is also off", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CRM_NEXT", "OFF"); vi.stubEnv("UNIFIED_CRM_CUSTOMER_READ_MODE", "OFF");
    await expect(searchDealCustomers(actor, new URLSearchParams())).rejects.toMatchObject({ status: 403 });
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
