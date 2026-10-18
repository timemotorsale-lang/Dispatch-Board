import { requireCurrentUser } from "@/server/auth/current-user";
import { canManageSettings } from "@/server/policies/access";
import { getLaborCatalogSettings } from "@/server/services/labor-catalog-settings";
import { LaborCatalogPanel } from "@/features/settings/labor-catalog-panel";
import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";

export default async function LaborCatalogSettingsPage() {
  const user = await requireCurrentUser("/settings/labor-catalog");
  if (!canManageSettings(user)) return <section><h1>Catalog approvals</h1><p>Manager access required.</p></section>;
  const initial = await getLaborCatalogSettings(user);
  return <div className="settings-workspace"><SettingsWorkspaceNav active="labor-catalog" /><main><h1>Catalog approvals</h1><LaborCatalogPanel initial={initial} currentUserId={user.id} /></main></div>;
}
