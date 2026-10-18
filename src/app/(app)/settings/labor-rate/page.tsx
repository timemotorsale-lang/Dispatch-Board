import { requireCurrentUser } from "@/server/auth/current-user";
import { canManageSettings } from "@/server/policies/access";
import { getLaborRateSettings } from "@/server/services/labor-rate-settings";
import { LaborRatePanel } from "@/features/settings/labor-rate-panel";
import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";

export default async function LaborRateSettingsPage() {
  const user = await requireCurrentUser("/settings/labor-rate");
  if (!canManageSettings(user)) return <section><h1>Labor rate settings</h1><p>Manager access required. Your existing estimates are unchanged.</p></section>;
  const initial = await getLaborRateSettings(user);
  return <div className="settings-workspace"><SettingsWorkspaceNav active="labor-rate" /><main><h1>Labor rate settings</h1><LaborRatePanel initial={initial} currentUserId={user.id} /></main></div>;
}
