import { RepairOrderCoreWorkspace } from "@/features/inventory/repair-order-core-workspace";
import { RepairOrderEnterpriseWorkbench } from "@/features/inventory/repair-order-enterprise-workbench";
import { ServiceIntakeWorkspace } from "@/features/inventory/service-intake-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";
import { getShopPlanningDetail } from "@/server/shop-planning/service";

export default async function RepairOrderCorePage({ searchParams }: { searchParams?: Promise<{ concernSummary?: string; intakeSource?: string; repairOrderId?: string; vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const [initial, options] = await Promise.all([
    listRepairOrders(user, { page: 1, pageSize: 25, query: "" }),
    getRepairOrderCreateOptions(user),
  ]);
  const serializedOptions = JSON.parse(JSON.stringify(options));
  if (params.intakeSource === "WALK_IN" && !params.vehicleId) return <ServiceIntakeWorkspace options={serializedOptions} />;
  if (params.repairOrderId) {
    const order = await getShopPlanningDetail(user, params.repairOrderId);
    return <RepairOrderEnterpriseWorkbench order={JSON.parse(JSON.stringify(order))} options={{ users: serializedOptions.users }} />;
  }
  return <RepairOrderCoreWorkspace initial={JSON.parse(JSON.stringify(initial))} initialDraft={{ concernSummary: params.concernSummary?.slice(0, 500) ?? "", intakeSource: params.intakeSource === "WALK_IN" ? "WALK_IN" : "", vehicleId: params.vehicleId ?? "" }} options={serializedOptions} />;
}
