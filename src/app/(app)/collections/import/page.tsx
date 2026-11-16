import { listCollectionsImports } from "@/features/collections/server/import-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { ImportScreen } from "@/features/collections/ui/import-screen";

export default async function CollectionsImportPage() {
  const user = await requireCollectionsPage("IMPORT");
  const runs = await listCollectionsImports(user);
  return (
    <CollectionsFrame section="import" title="Import DealerCenter accounts" description="Upload the Active Accounts export every morning. You'll see a preview before anything is saved.">
      <ImportScreen initialRuns={runs} />
    </CollectionsFrame>
  );
}
