import { describe, expect, it, vi } from "vitest";
import type { AggregateTx } from "@/server/enterprise-command/aggregate-mutation";
import { checkReconPurchaseApproval } from "@/server/service-close-parts/procurement-budget";

function fixture(origin = "INVENTORY_RECON", budget: number | null = 10000, spend = 13500) {
  const findFirst = vi.fn().mockResolvedValue({ demand: { repairOrder: {
    origin, inventoryUnitId: "unit-1",
    inventoryUnit: { acquisitionAppraisals: [{ estimatedReconCents: budget }] },
  } } });
  const aggregate = vi.fn().mockResolvedValue({ _sum: { orderedTotalCents: spend } });
  return { tx: { partRequisition: { findFirst }, partPurchaseOrder: { aggregate } } as unknown as AggregateTx, aggregate, findFirst };
}
const input = { organizationId: "org-1", purchaseOrderId: "po-1", requisitionId: "req-1", managerAuthority: false };

describe("recon purchase approval", () => {
  it("never applies the internal recon ceiling to a customer vehicle", async () => {
    const { tx, aggregate } = fixture("CUSTOMER_REPAIR", 0);
    expect(await checkReconPurchaseApproval(tx, input)).toBeNull();
    expect(aggregate).not.toHaveBeenCalled();
  });
  it("does not turn an absent budget into a zero-dollar block", async () => {
    const { tx, aggregate } = fixture("INVENTORY_RECON", null);
    expect(await checkReconPurchaseApproval(tx, input)).toBeNull();
    expect(aggregate).not.toHaveBeenCalled();
  });
  it("requires manager authority at approval, with a direct recovery instruction", async () => {
    const { tx } = fixture();
    await expect(checkReconPurchaseApproval(tx, input)).rejects.toThrow(
      "by $35.00. The purchase details are saved. Ask a manager",
    );
  });
  it("records a manager's purchase-specific overage without changing the customer estimate", async () => {
    const { tx } = fixture();
    expect(await checkReconPurchaseApproval(tx, { ...input, managerAuthority: true })).toEqual({
      budgetCents: 10000, approvedSpendCents: 13500, overBudgetCents: 3500, managerOverride: true,
    });
  });
  it("counts approvals across the inventory unit, including closed purchases and this draft only", async () => {
    const { tx, aggregate } = fixture("INVENTORY_RECON", 15000);
    await checkReconPurchaseApproval(tx, input);
    expect(aggregate).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        requisition: { demand: { repairOrder: { origin: "INVENTORY_RECON", inventoryUnitId: "unit-1" } } },
        OR: [{ id: "po-1" }, { status: { notIn: ["DRAFT", "CANCELLED"] } }],
      }, _sum: { orderedTotalCents: true },
    });
  });
  it("keeps a recorded zero budget meaningful at purchase approval", async () => {
    const { tx } = fixture("INVENTORY_RECON", 0, 3500);
    await expect(checkReconPurchaseApproval(tx, input)).rejects.toThrow("by $35.00");
  });
});
