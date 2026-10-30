import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ locations: vi.fn(), grants: vi.fn(), storage: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { location: { findMany: mocks.locations } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: mocks.storage }));
import { dealDocumentOrganization, dealIdentityOptions, dealOrganization } from "@/server/deal-continuity/identities";
import { resolveDealSource } from "@/server/deal-continuity/service";

const manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
describe("shared deal location options", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv("DOCUMENT_LIBRARY_ORGANIZATION_ID", "");
    mocks.storage.mockReturnValue({ organizationId: "default-org" });
    mocks.locations.mockResolvedValue([{ id: "minneapolis", name: "Time Motor Sales — Minneapolis" }]);
    mocks.grants.mockResolvedValue([]);
  });

  it("uses the operational company when document storage has only its placeholder", async () => {
    expect(dealDocumentOrganization()).toBe("default-org");
    expect(dealOrganization()).toBe("org-time-motor-sales");
    expect((await dealIdentityOptions(manager)).locations).toHaveLength(1);
    expect(mocks.locations).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-time-motor-sales" } }));
  });

  it("does not silently replace an explicitly configured tenant", async () => {
    vi.stubEnv("DOCUMENT_LIBRARY_ORGANIZATION_ID", "other-company");
    mocks.storage.mockReturnValue({ organizationId: "other-company" });
    await dealIdentityOptions(manager);
    expect(mocks.locations).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "other-company" } }));
  });

  it("filters capabilities for the requested record type and respects explicit denial", async () => {
    mocks.grants.mockResolvedValue([{ capability: "CUSTOMER_INTAKE_CREATE", effect: "DENY", locationId: "minneapolis", validFrom: new Date("2020-01-01"), validTo: null, constraints: {} }]);
    await expect(dealIdentityOptions(manager, "customer")).rejects.toMatchObject({ status: 403 });
    expect((await dealIdentityOptions(manager, "vehicle")).locations).toHaveLength(1);
  });

  it("reports missing configuration rather than returning an unusable empty selector", async () => {
    mocks.locations.mockResolvedValue([]);
    await expect(dealIdentityOptions(manager)).rejects.toThrow("No company locations are configured");
    await expect(dealIdentityOptions(null)).rejects.toThrow();
  });

  it("keeps legacy saved drafts in their original document namespace", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "draft", customerName: "Unselected", customerId: null, vehicleReference: "", pathway: "repairs", continuity: null });
    const database = { dealDeskDraft: { findFirst } } as unknown as Prisma.TransactionClient;
    await resolveDealSource(manager, { sourceDraftId: "draft" }, database);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "draft", organizationId: "default-org" }) }));
  });
});
