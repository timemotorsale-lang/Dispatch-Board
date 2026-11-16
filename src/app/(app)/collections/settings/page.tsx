import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { getSettingsPage } from "@/features/collections/server/settings-service";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { SettingsScreen } from "@/features/collections/ui/settings-screen";

export default async function CollectionsSettingsPage() {
  const user = await requireCollectionsPage("EDIT_SETTINGS");
  const page = await getSettingsPage(user);
  return (
    <CollectionsFrame section="settings" title="Collections settings" description="Admins only. Every change is saved as a new version with who changed it.">
      <SettingsScreen page={page} />
    </CollectionsFrame>
  );
}
