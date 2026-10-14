import { VehicleExecutionWorkbench } from "@/features/inventory/vehicle-execution-workbench";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleExecutionWorkbench } from "@/server/inventory-execution/workbench-service";
import Link from "next/link";

function VehicleWorkbenchUnavailable({ vehicleId }: { vehicleId: string }) {
  return (
    <section className="page-stack">
      <header className="page-copy">
        <span className="eyebrow">Vehicle Workbench</span>
        <h1>Vehicle workspace needs attention</h1>
        <p>
          The vehicle workbench could not finish loading its current work packet. Your saved work
          was not changed. Use a safe route below to continue.
        </p>
        <div className="form-actions">
          <Link className="button button-primary" href={`/vehicles/${encodeURIComponent(vehicleId)}/workbench`}>
            Retry vehicle workspace
          </Link>
          <Link className="button button-secondary" href={`/vehicles/360/${encodeURIComponent(vehicleId)}`}>
            Open Vehicle 360
          </Link>
          <Link className="button button-secondary" href="/vehicles/registry">
            Find Vehicle
          </Link>
          <Link className="button button-secondary" href="/vehicles/inventory">
            Inventory Lifecycle
          </Link>
        </div>
      </header>
      <section className="notice notice-warning" role="status">
        <p>
          The source workbench data is temporarily unavailable. Retry after refresh, or reopen the
          vehicle from the registry.
        </p>
      </section>
    </section>
  );
}

export default async function VehicleWorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params;
  const projection = await getVehicleExecutionWorkbench(user, id).catch(() => null);
  if (!projection) return <VehicleWorkbenchUnavailable vehicleId={id} />;
  return <VehicleExecutionWorkbench initial={JSON.parse(JSON.stringify(projection))} />;
}
