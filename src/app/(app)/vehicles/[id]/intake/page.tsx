import { ErrorStateCard } from "@/components/ui/state-card";
import { VehicleIntakeWorkspace } from "@/features/inventory/vehicle-intake-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleIntake } from "@/server/inventory-unit/intake-service";
import { getVehicleCosts } from "@/server/inventory-unit/service";

function intakeUnavailableMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Vehicle capability required")) {
    return "This compact acquisition intake includes protected inventory and cost details. Open the vehicle record, or use an Inventory Manager, Service Advisor, Vehicle Operations Lead, manager, or granted user to continue intake.";
  }
  if (message === "Authentication required.") {
    return "Sign in again to continue acquisition intake. Your vehicle record was not changed by this failed page load.";
  }
  return "The vehicle was created, but the compact acquisition intake could not finish loading. Return to the vehicle record or Inventory Lifecycle and retry intake from there.";
}

export default async function VehicleIntakePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser(), { id } = await params;
  const model = await getVehicleIntake(user, id).catch((error: unknown) => ({ error }));
  if ("error" in model) {
    return (
      <div className="page-shell">
        <ErrorStateCard
          actions={[
            { href: `/vehicles/360/${encodeURIComponent(id)}`, label: "Open Vehicle Record" },
            { href: "/vehicles", label: "Open Inventory Lifecycle", tone: "secondary" }
          ]}
          eyebrow="Acquisition intake unavailable"
          message={intakeUnavailableMessage(model.error)}
          title="Couldn't open compact intake"
        />
      </div>
    );
  }
  const costs = await getVehicleCosts(user, id).catch(() => null);
  return <VehicleIntakeWorkspace model={model} costs={costs ? JSON.parse(JSON.stringify(costs)) : null} />;
}
