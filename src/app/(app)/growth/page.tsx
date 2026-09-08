import { GrowthConsoleFoundation } from "@/features/growth/growth-console-foundation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getGrowthOperationalHome } from "@/server/growth/operational-service";

export default async function GrowthPage() {
  const user = await getCurrentUser().catch(() => null);
  const operationalHome = user ? await getGrowthOperationalHome(user).catch(() => null) : null;

  return <GrowthConsoleFoundation model={operationalHome ?? undefined} />;
}
