import { getIntegrationsHealth } from "@/features/collections/server/integrations/registry";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { IntegrationsScreen } from "@/features/collections/ui/integrations-screen";

export default async function CollectionsIntegrationsPage() {
  const user = await requireCollectionsPage("EDIT_SETTINGS");
  const rows = await getIntegrationsHealth(user);
  return (
    <CollectionsFrame section="integrations" title="Integrations" description="Outside services Collections can plug into later. In Release 1 they are all OFF or TEST (fake): nothing contacts a real vendor.">
      <IntegrationsScreen rows={rows} />
    </CollectionsFrame>
  );
}
