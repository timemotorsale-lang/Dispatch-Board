import { notFound, redirect } from "next/navigation";

import { RepairOrderCoreWorkspace } from "@/features/inventory/repair-order-core-workspace";
import { ServiceIntakeWorkspace } from "@/features/inventory/service-intake-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getWorkspaceKey } from "@/server/auth/navigation";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";
import { getServiceHandoffIntake } from "@/server/repair-order/task-handoff";
import Link from "next/link";

function safeReturnTo(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}

function safeSearch(value?: string) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export default async function RepairOrderCorePage({ searchParams }: { searchParams?: Promise<{ customerId?: string; reviewWorkbench?: string; concernSummary?: string; intakeSource?: string; repairOrderId?: string; returnTo?: string; search?: string; serviceHandoff?: string; source?: string; vehicleId?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  if (params.serviceHandoff) {
    const handoff = await getServiceHandoffIntake(user, params.serviceHandoff).catch(() => null);
    if (!handoff) return <section className="page-copy"><h1>Service handoff unavailable</h1><p>Ask the task owner or receiving advisor to reopen the current handoff.</p><Link href="/vehicles/repair-workbench">Return to Repair Workbench</Link></section>;
    if (handoff.repairOrderId) redirect(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(handoff.repairOrderId)}`);
    const allOptions = await getRepairOrderCreateOptions(user);
    const options = {
      ...allOptions,
      locations: allOptions.locations.filter(item => item.id === handoff.locationId),
      appointments: allOptions.appointments.filter(item => item.locationId === handoff.locationId),
      repairOrders: allOptions.repairOrders.filter(item => item.locationId === handoff.locationId)
    };
    if (!options.locations.length) notFound();
    return <ServiceIntakeWorkspace
      key={handoff.requestToken}
      currentUserId={user.id}
      initialCustomerId={handoff.task.customerId ?? ""}
      initialVehicleId={handoff.task.vehicleId ?? ""}
      initialConcernSummary={handoff.concern}
      initialTimestamp={new Date().toISOString()}
      options={JSON.parse(JSON.stringify(options))}
      returnTo={`/tasks/${encodeURIComponent(handoff.taskId)}?tool=serviceHandoff`}
      sourceHandoff={{ taskId: handoff.taskId, requestToken: handoff.requestToken, title: handoff.task.title }}
    />;
  }
  if (params.repairOrderId) {
    redirect(`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(params.repairOrderId)}`);
  }
  const search = safeSearch(params.search);
  const [initial, options] = await Promise.all([
    listRepairOrders(user, { page: 1, pageSize: 25, query: search }),
    getRepairOrderCreateOptions(user),
  ]);
  if (search && initial.total === 1 && initial.items[0]) {
    const match = initial.items[0];
    redirect(`/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId: match.id, vehicleId: match.vehicle.id }).toString()}`);
  }
  const showAdvisorReturn = getWorkspaceKey(user) === "ADVISOR";
  const serializedOptions = JSON.parse(JSON.stringify(options));
  const requestedIntakeSource = params.intakeSource ?? params.source;
  const customerId = requestedIntakeSource === "WALK_IN" ? params.customerId?.trim() : undefined;
  if (customerId && (!options.customers.some(customer => customer.id === customerId) || (params.vehicleId && !options.vehicles.some(vehicle => vehicle.id === params.vehicleId)))) notFound();
  if (requestedIntakeSource === "WALK_IN" || requestedIntakeSource === "INVENTORY_RECON") return <ServiceIntakeWorkspace reviewWorkbench={params.reviewWorkbench === "1"} currentUserId={user.id} initialCustomerId={customerId} initialArrivalQuery={params.search?.slice(0, 120)} initialConcernSummary={params.concernSummary?.slice(0, 500)} initialTimestamp={new Date().toISOString()} initialVehicleId={params.vehicleId} initialVehicleRelationship={requestedIntakeSource === "INVENTORY_RECON" ? "DEALERSHIP_INVENTORY" : "CUSTOMER_VEHICLE"} options={serializedOptions} returnTo={safeReturnTo(params.returnTo)} showAdvisorReturn={showAdvisorReturn} />;
  const intakeSource = requestedIntakeSource === "WALK_IN" || requestedIntakeSource === "INVENTORY_RECON" ? requestedIntakeSource : "";
  return <RepairOrderCoreWorkspace initial={JSON.parse(JSON.stringify(initial))} initialDraft={{ concernSummary: params.concernSummary?.slice(0, 500) ?? "", intakeSource, vehicleId: params.vehicleId ?? "" }} initialSearch={search} options={serializedOptions} />;
}
