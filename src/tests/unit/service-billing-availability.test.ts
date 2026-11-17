import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ order: vi.fn(), invoices: vi.fn(), entries: vi.fn(), packages: vi.fn(), grants: vi.fn(), flags: vi.fn(), candidate: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { repairOrder: { findFirst: mocks.order }, serviceInvoice: { findMany: mocks.invoices }, serviceInvoiceEntry: { findMany: mocks.entries }, serviceInvoicePackage: { findMany: mocks.packages } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants, listFeatureFlags: mocks.flags }) }));
vi.mock("@/server/service-close-parts/invoice-candidate", () => ({ serviceInvoiceCandidate: mocks.candidate }));
vi.mock("@/server/service-billing/deposits", () => ({ DEPOSIT_ACTIONS: [], getRepairDepositView: async () => ({ version: 0, entries: [], balance: { collectedCents: 0, refundedCents: 0, appliedCents: 0, availableCents: 0 }, collectionAvailability: { allowed: false, reason: "No estimate", maxAmountCents: 0 } }) }));
import { getServiceBilling, billingAccess } from "@/server/service-billing/service";
const actor = { id: "advisor", name: "Advisor", email: "advisor@example.test", isActive: true, roles: ["Service Advisor"], duties: { all: [], direct: [], roleDefaults: [] } };
const grant = (capability: string, locationId = "store-1", effect = "ALLOW") => ({ capability, locationId, effect, validFrom: new Date(0), validTo: null });
const flag = (code: string, mode = "GENERAL") => ({ code, mode, locationId: null, allowedUserIds: [], rolloutPercent: 0 });
beforeEach(() => {
  vi.resetAllMocks(); mocks.order.mockResolvedValue({ id: "ro-1", locationId: "store-1", repairOrderNumber: "RO-1", closedAt: null });
  mocks.grants.mockResolvedValue([grant("SERVICE_BILLING_VIEW")]); mocks.flags.mockResolvedValue([flag("VEHICLE_OPERATIONS_MASTER"), flag("SHOP_OPERATIONS")]);
  mocks.invoices.mockResolvedValue([]); mocks.entries.mockResolvedValue([]); mocks.packages.mockResolvedValue([]); mocks.candidate.mockResolvedValue({ mismatchCodes: [], fingerprint: "same" });
});
describe("billing mutation availability is informational, never an authorization bypass", () => {
  it("offers rollout settings only with page access and both global capabilities", async () => {
    const manager = { ...actor, roles: ["General Manager"] };
    mocks.grants.mockResolvedValue([]);
    expect((await getServiceBilling(manager, "ro-1")).mutationAvailability.canManageRollout).toBe(true);
    for (const capability of ["VEHICLE_HEALTH_VIEW", "VEHICLE_ROLLOUT_MANAGE"]) {
      mocks.grants.mockResolvedValue([{ ...grant(capability, "store-1", "DENY"), locationId: null }]);
      expect((await getServiceBilling(manager, "ro-1")).mutationAvailability.canManageRollout).toBe(false);
    }
    mocks.grants.mockResolvedValue([grant("SERVICE_BILLING_VIEW"), ...["VEHICLE_HEALTH_VIEW", "VEHICLE_ROLLOUT_MANAGE"].map(capability => ({ ...grant(capability), locationId: null }))]);
    expect((await getServiceBilling(actor, "ro-1")).mutationAvailability.canManageRollout).toBe(false);
  });

  it("allows billing readers to load but explains why they cannot create or pay", async () => {
    const result = await getServiceBilling(actor, "ro-1"); expect(result.canManage).toBe(false); expect(result.mutationAvailability).toMatchObject({ allowed: false });
    expect(result.mutationAvailability.reason).toContain("view and print"); expect(mocks.flags).not.toHaveBeenCalled();
    await expect(billingAccess(actor, "store-1", true)).rejects.toThrow("SERVICE_BILLING_MANAGE");
  });
  it("does not treat another store's manage grant as permission", async () => {
    mocks.grants.mockResolvedValue([grant("SERVICE_BILLING_VIEW"), grant("SERVICE_BILLING_MANAGE", "store-2")]);
    expect((await getServiceBilling(actor, "ro-1")).canManage).toBe(false);
  });
  it("allows an authorized manager only when rollout and order state allow mutation", async () => {
    mocks.grants.mockResolvedValue([grant("SERVICE_BILLING_VIEW"), grant("SERVICE_BILLING_MANAGE")]);
    expect((await getServiceBilling(actor, "ro-1")).mutationAvailability).toMatchObject({ allowed: true, reason: null });
    await expect(billingAccess(actor, "store-1", true)).resolves.toEqual(actor);
  });
  it.each([["OFF", "paused"], ["SHADOW", "preview"], ["PILOT", "pilot"]])("explains %s rollout while preserving read access", async (mode, expected) => {
    mocks.grants.mockResolvedValue([grant("SERVICE_BILLING_VIEW"), grant("SERVICE_BILLING_MANAGE")]);
    mocks.flags.mockResolvedValue([flag("VEHICLE_OPERATIONS_MASTER"), flag("SHOP_OPERATIONS", mode)]);
    const result = await getServiceBilling(actor, "ro-1"); expect(result.canManage).toBe(true); expect(result.mutationAvailability.allowed).toBe(false); expect(result.mutationAvailability.reason).toContain(expected);
    await expect(billingAccess(actor, "store-1", true)).rejects.toThrow("not enabled");
  });
  it("keeps closed-order billing readable and disables mutations", async () => {
    mocks.grants.mockResolvedValue([grant("SERVICE_BILLING_VIEW"), grant("SERVICE_BILLING_MANAGE")]); mocks.order.mockResolvedValue({ id: "ro-1", locationId: "store-1", closedAt: new Date() });
    expect((await getServiceBilling(actor, "ro-1")).mutationAvailability.reason).toContain("closed"); expect(mocks.flags).not.toHaveBeenCalled();
  });
  it.each([null, [], "old import"])("handles legacy snapshot %j without inventing amounts", async sourceSnapshot => {
    mocks.packages.mockResolvedValue([{ id: "old-package", version: 1, mismatchCodes: [], sourceSnapshot }]);
    expect((await getServiceBilling(actor, "ro-1")).packages[0]).toMatchObject({ billingMode: "LEGACY_REVIEW_REQUIRED", preview: null, identity: null });
  });
  it("does not weaken financial or store read denial", async () => {
    mocks.grants.mockResolvedValue([]); await expect(getServiceBilling(actor, "ro-1")).rejects.toThrow("SERVICE_BILLING_VIEW");
    mocks.grants.mockResolvedValue([grant("SERVICE_BILLING_VIEW"), grant("REPAIR_ORDER_VIEW", "store-1", "DENY")]); await expect(getServiceBilling(actor, "ro-1")).rejects.toThrow("REPAIR_ORDER_VIEW"); expect(mocks.invoices).not.toHaveBeenCalled();
  });
});
