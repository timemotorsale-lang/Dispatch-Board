import { partsProcurementType, recordedReconBudget } from "@/lib/parts-procurement";
import { formatMoneyCents } from "@/lib/recon-budget";
import type { AggregateTx } from "@/server/enterprise-command/aggregate-mutation";

// Called inside the serializable PO approval transaction, never while recording a draft.
export async function checkReconPurchaseApproval(tx: AggregateTx, input: {
  organizationId: string;
  purchaseOrderId: string;
  requisitionId: string | null;
  managerAuthority: boolean;
}) {
  if (!input.requisitionId) return null;
  const requisition = await tx.partRequisition.findFirst({
    where: { id: input.requisitionId, organizationId: input.organizationId },
    select: { demand: { select: { repairOrder: { select: {
      origin: true, inventoryUnitId: true,
      inventoryUnit: { select: {
        acquisitionCase: { select: { appraisalSnapshot: true } },
        acquisitionAppraisals: { orderBy: { version: "desc" }, take: 1, select: { estimatedReconCents: true, estimatedRetailCents: true } },
      } },
    } } } } },
  });
  const order = requisition?.demand.repairOrder;
  if (!order || partsProcurementType(order) !== "INVENTORY_RECON" || !order.inventoryUnitId) return null;
  const budgetCents = recordedReconBudget(order)?.estimatedReconBudgetCents;
  // Missing appraisal information is not a fabricated zero-dollar allowance.
  if (budgetCents == null) return null;
  const spend = await tx.partPurchaseOrder.aggregate({
    where: {
      organizationId: input.organizationId,
      requisition: { demand: { repairOrder: { origin: "INVENTORY_RECON", inventoryUnitId: order.inventoryUnitId } } },
      OR: [{ id: input.purchaseOrderId }, { status: { notIn: ["DRAFT", "CANCELLED"] } }],
    },
    _sum: { orderedTotalCents: true },
  });
  const approvedSpendCents = spend._sum.orderedTotalCents ?? 0;
  const overBudgetCents = Math.max(0, approvedSpendCents - budgetCents);
  if (overBudgetCents > 0 && !input.managerAuthority) {
    throw new Error(`Internal recon purchases exceed the recorded budget by ${formatMoneyCents(overBudgetCents)}. The purchase details are saved. Ask a manager to approve this purchase order, or open Review recon budget to adjust the allowance.`);
  }
  return { budgetCents, approvedSpendCents, overBudgetCents, managerOverride: overBudgetCents > 0 };
}
