import { formatDay } from "@/features/collections/domain/account-ref";
import { getHome } from "@/features/collections/server/home-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { HomeActions, HomeScreen } from "@/features/collections/ui/home-screen";

export default async function CollectionsHomePage() {
  const user = await requireCollectionsPage("VIEW");
  const home = await getHome(user);
  return (
    <CollectionsFrame section="home" title={`${home.greeting}, ${home.firstName}`} description={`${home.dateLabel}${home.dataAsOf ? ` · DealerCenter data as of ${formatDay(home.dataAsOf)}` : " · No DealerCenter data yet"}`} actions={<HomeActions h={home} />}>
      <HomeScreen h={home} />
    </CollectionsFrame>
  );
}
