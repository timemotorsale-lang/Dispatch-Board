import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), findMany: vi.fn(), execute: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { vehiclePolicyVersion: { findFirst: mocks.findFirst, findMany: mocks.findMany } } }));
vi.mock("@/server/customer-lifecycle/service", () => ({ executeCustomerLifecycleCommand: mocks.execute }));
import { changeLaborCatalogSettings, getConnectedCatalogSystems, getLaborCatalogSettings } from "@/server/services/labor-catalog-settings";
import { catalogScopeDigest, validateCatalogApproval } from "@/server/diagnostics/catalog-approval";
import { LIGHT_DUTY_CATALOG_VERSION } from "@/lib/light-duty-baseline";

const manager = { id: "author", roles: ["General Manager"], duties: { all: [] } } as unknown as AuthenticatedUser;
const staff = { id: "staff", roles: ["Mechanic"], duties: { all: [] } } as unknown as AuthenticatedUser;
const config = () => ({ version: 1, catalogVersion: LIGHT_DUTY_CATALOG_VERSION, systemId: "engine", scopeDigest: catalogScopeDigest("engine"), enabled: true, reviewReference: "Shop scope review artifact engine-1", capabilityReference: "Personnel/equipment review artifact engine-1" });
const policy = () => ({ id: "policy-1", policyCode: "LABOR_CATALOG_ENGINE", version: 1, createdByUserId: "author", approvedByUserId: "reviewer", approvedAt: new Date("2026-10-15"), activatedAt: new Date("2026-10-16"), configuration: config(), createdAt: new Date("2026-10-14") });

beforeEach(() => { vi.resetAllMocks(); mocks.findFirst.mockResolvedValue(null); mocks.findMany.mockResolvedValue([]); });
describe("versioned expanded catalog approval", () => {
  it("keeps all expanded systems disabled by default and rejects unauthorized settings access", async () => {
    expect((await getConnectedCatalogSystems(staff)).allowedSystemIds).toEqual(["brakes", "steering"]);
    await expect(getLaborCatalogSettings(staff)).rejects.toThrow("Manager access");
    await expect(changeLaborCatalogSettings(staff, {})).rejects.toThrow("Manager access");
    await expect(getConnectedCatalogSystems(null)).rejects.toThrow("Authentication");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("requires current independent active policy records, including an immutable scope fingerprint", async () => {
    mocks.findFirst.mockImplementation(async ({ where }) => where.policyCode === "LABOR_CATALOG_ENGINE" ? policy() : null);
    expect((await getConnectedCatalogSystems(staff)).allowedSystemIds).toContain("engine");
    mocks.findFirst.mockResolvedValue({ ...policy(), approvedByUserId: "author" });
    expect((await getConnectedCatalogSystems(staff)).allowedSystemIds).toEqual(["brakes", "steering"]);
    expect(() => validateCatalogApproval({ ...config(), scopeDigest: "old" })).toThrow("scope changed");
  });
  it("fails closed on unavailable, disabled or stale approvals", async () => {
    for (const value of [{ ...policy(), configuration: { ...config(), enabled: false } }, { ...policy(), configuration: { ...config(), scopeDigest: "old" } }]) {
      mocks.findFirst.mockResolvedValue(value);
      expect((await getConnectedCatalogSystems(staff)).allowedSystemIds).toEqual(["brakes", "steering"]);
    }
    mocks.findFirst.mockRejectedValue(new Error("Unavailable"));
    expect(await getConnectedCatalogSystems(staff)).toMatchObject({ allowedSystemIds: ["brakes", "steering"], unavailable: true });
  });
  it("requires explicit complete-scope attestation and pins policy scope server-side", async () => {
    const input = { action: "CREATE_POLICY_DRAFT", systemId: "engine", scopeReviewed: true, enabled: true, reviewReference: config().reviewReference, capabilityReference: config().capabilityReference, reason: "Reviewed engine scope", idempotencyKey: "review-engine" };
    await expect(changeLaborCatalogSettings(manager, { ...input, scopeReviewed: false })).rejects.toThrow("Explicit review");
    await changeLaborCatalogSettings(manager, { ...input, policyCode: "UNRELATED", scopeDigest: "fabricated" });
    expect(mocks.execute).toHaveBeenCalledWith(manager, expect.objectContaining({ policyCode: "LABOR_CATALOG_ENGINE", domain: "LABOR_CATALOG", configuration: config() }));
  });
  it("uses stable existing policy transitions and rejects stale drafts and unrelated subjects", async () => {
    mocks.findFirst.mockResolvedValue(policy());
    const input = { action: "ACTIVATE_POLICY", subjectId: "policy-1", reason: "Activate independently approved scope", idempotencyKey: "activate-engine" };
    await changeLaborCatalogSettings(manager, input); await changeLaborCatalogSettings(manager, input);
    expect(mocks.execute.mock.calls[0]).toEqual(mocks.execute.mock.calls[1]);
    mocks.findFirst.mockResolvedValue({ ...policy(), configuration: { ...config(), catalogVersion: "old" } });
    await expect(changeLaborCatalogSettings(manager, input)).rejects.toThrow("scope changed");
    mocks.findFirst.mockResolvedValue(null);
    await expect(changeLaborCatalogSettings(manager, input)).rejects.toThrow("not found");
  });
});
