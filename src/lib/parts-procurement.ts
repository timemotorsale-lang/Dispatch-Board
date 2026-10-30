import { buildReconBudgetSummary } from "@/lib/recon-budget";

type Order = {
  origin?: string;
  inventoryUnit?: {
    acquisitionAppraisals?: Array<{ decisionStatus?: string; estimatedReconCents?: number | null; estimatedRetailCents?: number | null }>;
    acquisitionCase?: { appraisalSnapshot?: unknown } | null;
  } | null;
};

export function partsProcurementType(order?: Order | null): "INVENTORY_RECON" | "CUSTOMER_REPAIR" {
  // The repair's origin takes precedence over ownership and customer contact links.
  if (order?.origin === "CUSTOMER_REPAIR") return "CUSTOMER_REPAIR";
  if (order?.origin === "INVENTORY_RECON") return "INVENTORY_RECON";
  return order?.inventoryUnit ? "INVENTORY_RECON" : "CUSTOMER_REPAIR";
}

export function recordedReconBudget(order?: Order | null) {
  if (partsProcurementType(order) !== "INVENTORY_RECON") return null;
  const unit = order?.inventoryUnit;
  const latest = unit?.acquisitionAppraisals?.[0];
  // The latest recorded appraisal carries subsequent budget decisions forward.
  const hasRecordedAdjustment = latest?.estimatedReconCents != null;
  return buildReconBudgetSummary({
    acquisitionAppraisals: unit?.acquisitionAppraisals,
    acquisitionCase: hasRecordedAdjustment ? null : unit?.acquisitionCase,
  });
}

export function recordedPartsPurchaseTotal(purchases: Array<{ orderedTotalCents?: number; status?: string }>) {
  // Closing a PO does not erase its cost. Receipts are not added again.
  return purchases.filter((purchase) => purchase.status !== "CANCELLED")
    .reduce((sum, purchase) => sum + (purchase.orderedTotalCents ?? 0), 0);
}
