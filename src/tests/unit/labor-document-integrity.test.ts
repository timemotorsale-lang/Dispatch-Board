import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCustomerLifecycleRepository } from "@/server/customer-lifecycle/repository";
import { getShopPlanningDetail, getShopPlanningWorkspace } from "@/server/shop-planning/service";
import { assertCurrentInvoicePackage } from "@/server/service-close-parts/invoice-candidate";

const actor = { id: "manager", name: "Synthetic manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const now = new Date("2026-10-18T12:00:00Z");
function fixture() {
  const request = { id: "request", organizationId: "org", repairOrderId: "order", customerId: "customer", estimateVersionId: "estimate", estimateVersionNumber: 1, channel: "EMAIL", status: "PENDING", decisionEvidence: {}, expiresAt: new Date("2026-10-20"), createdByUserId: actor.id };
  const estimate = { id: "estimate", organizationId: "org", repairOrderId: "order", version: 1, status: "PRESENTED", expiresAt: new Date("2026-10-20"), lineItems: [{ key: "labor", type: "LABOR", description: "Repair", quantity: 1, unitPriceCents: 10000, taxable: false }, { key: "part", type: "PART", description: "Part", quantity: 2, unitPriceCents: 1000, taxable: true }], laborSubtotalCents: 10000, partsSubtotalCents: 2000, feeSubtotalCents: 0, taxCents: 160, discountCents: 0, totalCents: 12160 };
  const tx = {
    repairOrder: { findFirst: vi.fn().mockResolvedValue({id:"order"}) },
    vehiclePortalGrant: { findUnique: vi.fn().mockResolvedValue({ id: "grant", organizationId: "org", vehicleId: "vehicle", customerId: "customer", status: "ACTIVE", scopes: ["ESTIMATE_APPROVAL"], expiresAt: new Date("2026-10-20") }) },
    customerEstimateApprovalRequest: { findFirst: vi.fn().mockResolvedValue(request), update: vi.fn().mockImplementation(async ({ data }) => Object.assign(request, data)) },
    repairEstimateVersion: { findFirst: vi.fn().mockResolvedValue(estimate) },
    repairAuthorization: { create: vi.fn().mockImplementation(async ({ data }) => ({ id: "authorization", ...data })) },
    serviceDocument: { findFirst: vi.fn().mockResolvedValue({ content: { identity: { customer: "Frozen customer" } } }), create: vi.fn().mockImplementation(async ({ data }) => ({ id: "receipt", ...data })) },
    vehiclePortalAccessEvent: { create: vi.fn() }
  };
  return { tx, request, estimate, repository: createCustomerLifecycleRepository({ $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx) } as never) };
}
beforeEach(() => vi.clearAllMocks());
describe("labor document integrity regressions", () => {
  it("prices canonical portal lines and records a subset as PARTIAL, not ACCEPTED", async () => {
    const context = fixture();
    const input = { approvedLineKeys: ["part"], declinedLineKeys: [], decisionName: "Synthetic customer", requestHash: "request-proof" };
    expect(await context.repository.decideEstimate("token", "request", input, now)).toMatchObject({ status: "PARTIAL", approvedAmountCents: 2160, undecidedLineKeys: ["labor"] });
    expect(context.tx.repairOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ customerId: "customer", vehicleId: "vehicle" }) }));
    expect(await context.repository.decideEstimate("token", "request", input, now)).toMatchObject({ duplicate: true });
    expect(context.tx.repairAuthorization.create).toHaveBeenCalledTimes(1);
    await expect(context.repository.decideEstimate("token", "request", { ...input, decisionName: "Changed" }, now)).rejects.toThrow("different recorded decision");
  });
  it("refuses another vehicle's request and an expired or superseded estimate", async () => {
    const context = fixture(), input = { approvedLineKeys: ["labor"], declinedLineKeys: [], decisionName: "Synthetic", requestHash: "request" };
    context.tx.customerEstimateApprovalRequest.findFirst.mockResolvedValueOnce(null);
    await expect(context.repository.decideEstimate("token", "request", input, now)).rejects.toThrow("Scoped");
    context.estimate.status = "SUPERSEDED";
    await expect(context.repository.decideEstimate("token", "request", input, now)).rejects.toThrow("current presented");
    context.estimate.status = "PRESENTED"; context.estimate.expiresAt = new Date("2026-10-01");
    await expect(context.repository.decideEstimate("token", "request", input, now)).rejects.toThrow("expired or superseded");
    expect(context.tx.repairAuthorization.create).not.toHaveBeenCalled();
  });
  it("rejects the actual location's explicit deny and does not hide infrastructure failures", async () => {
    const row = { id: "order", locationId: "denied" };
    const foundationRepository = { listCapabilityGrants: vi.fn().mockResolvedValue([{ capability: "REPAIR_ORDER_VIEW", effect: "DENY", locationId: "denied", validFrom: new Date(0), validTo: null }]) };
    const repository = { get: vi.fn().mockResolvedValue(row), list: vi.fn().mockResolvedValue({ repairOrders: [row], users: [] }) };
    const options = { organizationId: "org", foundationRepository: foundationRepository as never, repository: repository as never, now: () => now };
    await expect(getShopPlanningDetail(actor, "order", options)).rejects.toThrow("EXPLICIT_DENY");
    expect(await getShopPlanningWorkspace(actor, options)).toMatchObject({ repairOrders: [] });
    foundationRepository.listCapabilityGrants.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(getShopPlanningWorkspace(actor, options)).rejects.toThrow("Database unavailable");
  });
  it("cannot clear QC mismatches by submitting or reconciling a financial total", async () => {
    await expect(assertCurrentInvoicePackage({} as never, "org", { repairOrderId: "order", mismatchCodes: ["INVOICE_JOB_QC_INCOMPLETE"], sourceSnapshot: {} })).rejects.toThrow("Resolve all");
  });
});
