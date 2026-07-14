import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";
import { VehicleOperationsFoundationPanel } from "@/features/settings/vehicle-operations-foundation-panel";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVehicleOperationsFoundation } from "@/server/enterprise-command/service";
import { canManageSettings } from "@/server/policies/access";

export default async function VehicleOperationsFoundationPage() {
  const user = await requireCurrentUser();
  if (!canManageSettings(user)) return <section className="page-stack"><div className="page-copy"><span className="eyebrow">Protected settings</span><h1>Vehicle Operations foundation</h1><p>Manager access is required.</p></div></section>;
  let model: Awaited<ReturnType<typeof getVehicleOperationsFoundation>> | null = null;
  let loadError = "";
  try {
    model = await getVehicleOperationsFoundation(user);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load Vehicle Operations foundation.";
  }
  if (!model) return <section className="page-stack"><div className="notice notice-danger"><p>{loadError}</p></div></section>;
  return <section className="settings-workspace"><SettingsWorkspaceNav active="vehicle-operations" /><div className="settings-stage"><div className="page-copy settings-page-copy"><span className="eyebrow">Protected settings</span><h1>Vehicle Operations command foundation</h1><p>Monitor command durability, outbox delivery, projection freshness, and controlled rollout.</p></div><VehicleOperationsFoundationPanel initialModel={model} /></div></section>;
}
