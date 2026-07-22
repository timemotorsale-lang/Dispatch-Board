import { redirect } from "next/navigation";

import { RepairOrderCoreWorkspace } from "@/features/inventory/repair-order-core-workspace";
import { ServiceIntakeWorkspace } from "@/features/inventory/service-intake-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";

function safeReturnTo(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}

export default async function RepairOrderCorePage({ searchParams }: { searchParams?: Promise<{ concernSummary?: string; intakeSource?: string; repairOrderId?: string; returnTo?: string; vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  if (params.repairOrderId) {
    redirect(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(params.repairOrderId)}`);
  }
  const [initial, options] = await Promise.all([
    listRepairOrders(user, { page: 1, pageSize: 25, query: "" }),
    getRepairOrderCreateOptions(user),
  ]);
  const serializedOptions = JSON.parse(JSON.stringify(options));
  if (params.intakeSource === "WALK_IN" && !params.vehicleId) return <ServiceIntakeWorkspace options={serializedOptions} returnTo={safeReturnTo(params.returnTo)} />;
  const intakeSource = params.intakeSource === "WALK_IN" || params.intakeSource === "INVENTORY_RECON" ? params.intakeSource : "";
  return <RepairOrderCoreWorkspace initial={JSON.parse(JSON.stringify(initial))} initialDraft={{ concernSummary: params.concernSummary?.slice(0, 500) ?? "", intakeSource, vehicleId: params.vehicleId ?? "" }} options={serializedOptions} />;
}
