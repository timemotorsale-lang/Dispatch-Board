import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { getPlaybookPage } from "@/features/collections/server/playbook-service";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { PlaybookScreen } from "@/features/collections/ui/playbook-screen";

export default async function CollectionsPlaybookPage() {
  const user = await requireCollectionsPage("EDIT_SETTINGS");
  const page = await getPlaybookPage(user);
  return (
    <CollectionsFrame section="playbook" title="Collections playbook" description="Which text goes out when, and which task or review is created at each stage. Safety rules can't be changed here.">
      <PlaybookScreen page={page} />
    </CollectionsFrame>
  );
}
