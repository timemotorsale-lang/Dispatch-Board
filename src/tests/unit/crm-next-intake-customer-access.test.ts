import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ locations: vi.fn(), grants: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "company-a" }) }));
import { authorizeDealOpportunityCustomer } from "@/server/deal-continuity/identities";
import { createUnifiedCrmOpportunityCreateRepository } from "@/server/repositories/unified-crm-opportunity-create-repository";
import { createUnifiedCrmOpportunity } from "@/server/services/unified-crm-opportunity-create-command-service";

const coordinator: AuthenticatedUser = { id: "coordinator", name: "Coordinator", email: "staff@example.test", isActive: true, roles: ["Operations Coordinator", "Office Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const input = { customerId: "shared-customer", ownerUserId: coordinator.id, title: "Fictional sale intake", nextActionLabel: "Prepare packet", nextActionDueAt: "2026-11-05T18:00:00Z", idempotencyKey: "intake-1" };
function harness(actor = coordinator, organizationId = "company-a", shared = true) {
  const customer = vi.fn(async ({ where }) => where.organizationId === "company-a" && !where.ownerUserId ? { id: "shared-customer", displayName: "Fictional Customer" } : null);
  const tx = {
    customer: { findFirst: customer }, userLocationAccess: { findMany: mocks.locations },
    user: { findFirst: vi.fn(async () => ({ id: actor.id })) },
    customerLead: { findFirst: vi.fn() },
    enterpriseCommandLedger: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({ id: "command-1" })) },
    enterpriseAggregateVersion: { create: vi.fn(async () => ({ version: 1 })) },
    enterpriseDomainEvent: { create: vi.fn(async () => ({ id: "event-1" })) },
    enterpriseAuditEvent: { create: vi.fn() }, enterpriseOutboxMessage: { create: vi.fn() },
    $executeRaw: vi.fn()
  };
  const database = { $transaction: vi.fn(async (run) => run(tx)) };
  const repository = createUnifiedCrmOpportunityCreateRepository(database as never);
  const run = (overrides = {}) => createUnifiedCrmOpportunity(actor, { ...input, ownerUserId: actor.id, ...overrides }, {
    mode: "REVIEW", now: () => new Date("2026-11-04T18:00:00Z"), scopeRepository: { listActiveOrganizationIds: async () => [organizationId] }, repository,
    ...(shared ? { authorizeCustomer: (id: string, org: string, transaction: Parameters<typeof authorizeDealOpportunityCustomer>[3]) => authorizeDealOpportunityCustomer(actor, id, org, transaction) } : {})
  });
  return { run, tx, customer };
}
describe("CRM Next intake uses the authorized shared customer identity", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.locations.mockResolvedValue([{ locationId: "location-a" }]); mocks.grants.mockResolvedValue([]); });
  it("completes coordinator intake for another owner's customer with audit and unchanged ownership rules", async () => {
    const { run, tx, customer } = harness();
    expect(await run()).toMatchObject({ opportunity: { customerId: "shared-customer", ownerUserId: coordinator.id } });
    expect(customer).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "company-a", status: "ACTIVE", mergedIntoCustomerId: null }) }));
    expect(customer.mock.calls[1][0].where).toMatchObject({ archivedAt: null });
    expect(tx.enterpriseAuditEvent.create).toHaveBeenCalledOnce();
  });
  it("keeps the legacy endpoint owner scoped", async () => {
    const { run, tx } = harness(coordinator, "company-a", false);
    await expect(run()).rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE" });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("does not grant salesperson access to another owner's identity", async () => {
    const { run, tx } = harness({ ...coordinator, roles: ["Salesperson"] });
    await expect(run()).rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE" });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("rejects a different organization even for a manager", async () => {
    const { run, tx } = harness({ ...coordinator, roles: ["General Manager"] }, "company-b");
    await expect(run()).rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE" });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("rechecks location access at submission", async () => {
    const { run, tx } = harness(); mocks.locations.mockResolvedValue([]);
    await expect(run()).rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE" });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("keeps deal owner assignment restricted", async () => {
    const { run, tx } = harness();
    await expect(run({ ownerUserId: "another-owner" })).rejects.toMatchObject({ code: "OWNER_NOT_AVAILABLE" });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("does not accept a customer that disappeared after selection", async () => {
    const { run, tx, customer } = harness(); customer.mockResolvedValue(null);
    await expect(run()).rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE" });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
