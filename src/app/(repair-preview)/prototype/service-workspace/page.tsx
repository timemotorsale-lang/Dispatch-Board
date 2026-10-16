import { requireCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderDetail, listRepairOrders } from "@/server/repair-order/service";
import { getShopPlanningDetail } from "@/server/shop-planning/service";
import { ServiceWorkspacePreview } from "@/features/prototype/repair-explorer/service-workspace-preview";
import type { ServiceContext } from "@/features/prototype/repair-explorer/service-preview-domain";

export const metadata = { title: "Service Workspace Preview | Dispatch Board" };
export const dynamic = "force-dynamic";

export default async function ServiceWorkspacePage({ searchParams }: { searchParams?: Promise<{ repairOrderId?: string; browse?: string }> }) {
  const user = await requireCurrentUser("/prototype/service-workspace");
  const params = await searchParams ?? {};
  let context: ServiceContext | undefined;
  let records: { id: string; label: string }[] = [];
  let notice = "";
  try {
    if (params.repairOrderId) {
      if (typeof params.repairOrderId !== "string" || params.repairOrderId.length > 100) throw new Error("Invalid reference");
      const order = await getRepairOrderDetail(user, params.repairOrderId);
      const planning = await getShopPlanningDetail(user, order.id);
      context = { id: order.id, roNumber: order.repairOrderNumber, roVersion: order.version, customer: order.customer?.displayName ?? "Internal vehicle / no customer", vehicleId: order.vehicle.id, vehicle: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber, concern: order.serviceVisit.concernSummary, latestEstimateVersion: Math.max(0, ...planning.estimateVersions.map(item => item.version)), live: true };
    } else if (params.browse === "1") {
      const orders = await listRepairOrders(user, { page: 1, pageSize: 20, state: "ACTIVE" });
      records = orders.items.map(order => ({ id: order.id, label: `${order.repairOrderNumber} · ${[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ")}` }));
      if (!records.length) notice = "No active repair orders were returned by the existing read service.";
    }
  } catch {
    notice = "Live RO context could not be loaded or access is unavailable. No live data was changed. The fictional review workspace remains available.";
  }
  return <ServiceWorkspacePreview key={context?.id ?? "review"} initialContext={context} records={records} notice={notice} explorerStorageKey={`dispatch-board.repair-explorer-preview.v1.${user.id}`} />;
}
