import { VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";
import { listVehicleWorkActions } from "@/server/repair-order/resume-service";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleRegistryDetail, getVehicleRegistryToolAccess, listVehicleRegistry } from "@/server/vehicle-registry/service";

export default async function VehicleRegistryPage({ searchParams }: { searchParams?: Promise<{ q?: string; query?: string; vehicleId?: string; page?: string }> }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const requestedQuery = params.query ?? params.q;
  const query = typeof requestedQuery === "string" ? requestedQuery.trim() : "";
  const page = typeof params.page === "string" && /^\d{1,7}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const [results, access, detail] = await Promise.allSettled([
    listVehicleRegistry(user, { page, pageSize: 25, query }).then(async registry => {
      const work = await listVehicleWorkActions(user, registry.items.map(item => item.id));
      return { ...registry, items: registry.items.map(item => ({ ...item, work: work[item.id] })) };
    }),
    getVehicleRegistryToolAccess(user),
    typeof params.vehicleId === "string" ? getVehicleRegistryDetail(user, params.vehicleId) : null,
  ]);
  return <VehicleRegistryWorkspace
    initial={results.status === "fulfilled" ? JSON.parse(JSON.stringify(results.value)) : null}
    initialQuery={query}
    initialPage={page}
    initialSelected={detail.status === "fulfilled" ? JSON.parse(JSON.stringify(detail.value)) : null}
    initialNotice={detail.status === "rejected" ? "This vehicle record could not be opened. Search for it below." : undefined}
    access={access.status === "fulfilled" ? access.value : undefined}
  />;
}
