import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { requireCurrentUser } from "@/server/auth/current-user";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";
import { LABOR_OPERATION_ADD_ONS, LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";
import { listRepairOrders } from "@/server/repair-order/service";

type PageProps = { searchParams?: Promise<{ mode?: string | string[]; repairOrderId?: string | string[]; returnLabel?: string | string[]; returnTo?: string | string[] }> };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
function safeReturnTo(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

export default async function DiagnosticsLaborGuidePage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const requestedMode = first(params.mode);
  const requestedRepairOrderId = first(params.repairOrderId);
  const returnTo = safeReturnTo(first(params.returnTo));
  const returnLabel = first(params.returnLabel)?.slice(0, 120);
  const orders = await listRepairOrders(user, { page: 1, pageSize: 10, state: "ACTIVE" }).catch(() => ({ items: [] }));
  const active = orders.items.find((order) => order.id === requestedRepairOrderId) ?? orders.items[0];
  const activeRepairOrder = active ? {
    id: active.id,
    repairOrderNumber: active.repairOrderNumber,
    openedAt: active.openedAt instanceof Date ? active.openedAt.toISOString() : String(active.openedAt),
    concern: active.serviceVisit.concernSummary,
    customer: active.customer?.displayName ?? active.inventoryUnit?.inventoryNumber ?? "Internal vehicle",
    vehicle: {
      id: active.vehicle.id,
      label: [active.vehicle.year, active.vehicle.make, active.vehicle.model].filter(Boolean).join(" ") || active.vehicle.vehicleNumber,
      vin: active.vehicle.vin ?? active.vehicle.vehicleNumber,
    },
  } : null;

  const repairOrders = orders.items.map((order) => ({
    id: order.id,
    label: `${order.repairOrderNumber} - ${[order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber}`,
  }));

  return <EnterpriseLaborGuideConsole activeRepairOrder={activeRepairOrder} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialMode={requestedMode === "engine" ? "engine" : "manual"} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={repairOrders} repairTaxonomy={LABOR_OPERATION_TAXONOMY} returnLabel={returnLabel} returnTo={returnTo} />;
}

