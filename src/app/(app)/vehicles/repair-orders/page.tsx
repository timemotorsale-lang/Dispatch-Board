import { redirect } from "next/navigation";

import { RepairOrderCoreWorkspace } from "@/features/inventory/repair-order-core-workspace";
import { ServiceIntakeWorkspace } from "@/features/inventory/service-intake-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getWorkspaceKey } from "@/server/auth/navigation";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";

function safeReturnTo(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}

export default async function RepairOrderCorePage({ searchParams }: { searchParams?: Promise<{ concernSummary?: string; intakeSource?: string; repairOrderId?: string; returnTo?: string; search?: string; source?: string; vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  if (params.repairOrderId) {
    redirect(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(params.repairOrderId)}`);
  }
  const [initial, options] = await Promise.all([
    listRepairOrders(user, { page: 1, pageSize: 25, query: "" }),
    getRepairOrderCreateOptions(user),
  ]);
  const showAdvisorReturn = getWorkspaceKey(user) === "ADVISOR";
  const serializedOptions = JSON.parse(JSON.stringify(options));
  const requestedIntakeSource = params.intakeSource ?? params.source;
  if (requestedIntakeSource === "WALK_IN" || requestedIntakeSource === "INVENTORY_RECON") return <ServiceIntakeWorkspace initialArrivalQuery={params.search?.slice(0, 120)} initialConcernSummary={params.concernSummary?.slice(0, 500)} initialTimestamp={new Date().toISOString()} initialVehicleId={params.vehicleId} initialVehicleRelationship={requestedIntakeSource === "INVENTORY_RECON" ? "DEALERSHIP_INVENTORY" : "CUSTOMER_VEHICLE"} options={serializedOptions} returnTo={safeReturnTo(params.returnTo)} showAdvisorReturn={showAdvisorReturn} />;
  const intakeSource = requestedIntakeSource === "WALK_IN" || requestedIntakeSource === "INVENTORY_RECON" ? requestedIntakeSource : "";
  return <RepairOrderCoreWorkspace initial={JSON.parse(JSON.stringify(initial))} initialDraft={{ concernSummary: params.concernSummary?.slice(0, 500) ?? "", intakeSource, vehicleId: params.vehicleId ?? "" }} options={serializedOptions} />;
}
