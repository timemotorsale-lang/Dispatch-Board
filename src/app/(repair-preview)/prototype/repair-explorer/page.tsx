import { RepairExplorer } from "@/features/prototype/repair-explorer/repair-explorer";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderDetail } from "@/server/repair-order/service";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { repairExplorerStorageKey, type RepairExplorerContext } from "@/lib/repair-explorer-context";

export const metadata = { title: "Labor Guide | Dispatch Board" };

export default async function RepairExplorerPreviewPage({ searchParams }: { searchParams?: Promise<{ workflow?: string; system?: string; group?: string; repairOrderId?: string | string[] }> } = {}) {
  const params = searchParams ? await searchParams : {};
  const repairOrderId = Array.isArray(params.repairOrderId) ? params.repairOrderId[0] : params.repairOrderId;
  const user = await requireCurrentUser(`/prototype/repair-explorer${repairOrderId ? `?${new URLSearchParams({ repairOrderId })}` : ""}`);
  let context: RepairExplorerContext | undefined;
  if (repairOrderId) {
    try {
      const [order, rate] = await Promise.all([getRepairOrderDetail(user, repairOrderId), getActiveLaborRate(user)]);
      if (!order || order.closedAt) throw new Error("Repair order is unavailable.");
      context = {
        reviewWorkflow: params.workflow === "review", repairOrderId: order.id, repairOrderNumber: order.repairOrderNumber,
        vehicleId: order.vehicle.id, vehicleLabel: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber,
        vin: order.vehicle.vin, inventoryUnitId: order.inventoryUnit?.id ?? null, inventoryNumber: order.inventoryUnit?.inventoryNumber ?? null,
        concern: order.serviceVisit.concernSummary, laborRate: rate.laborRate,
      };
    } catch {
      return <main><h1>Repair order could not open</h1><p role="alert">Verify access to an open repair order and the shop labor-rate settings, then retry. No sample vehicle or draft has been substituted.</p><a href="/diagnostics/labor-guide">Return to Labor Guide</a></main>;
    }
  }
  return <RepairExplorer storageKey={repairExplorerStorageKey(user.id, repairOrderId)} initialSystemId={params.system} initialGroupId={params.group} context={context} key={`${repairOrderId ?? "sample"}:${params.system ?? "brakes"}:${params.group ?? ""}`} />;
}
