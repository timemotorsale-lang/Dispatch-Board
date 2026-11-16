import { getDashboard } from "@/features/collections/server/dashboard-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { DashboardScreen } from "@/features/collections/ui/dashboard-screen";

export default async function CollectionsDashboardPage() {
  const user = await requireCollectionsPage("VIEW_DASHBOARD");
  const data = await getDashboard(user);
  return (
    <CollectionsFrame section="dashboard" title="Collections dashboard" description="Where the portfolio stands today, and how it's trending.">
      <DashboardScreen data={data} />
    </CollectionsFrame>
  );
}
