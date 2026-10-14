import { GrowthAdminUnavailable } from "@/features/growth/growth-admin-review-console";
import { GrowthResultsDashboard } from "@/features/growth/growth-results-dashboard";
import { getCurrentUser } from "@/server/auth/current-user";
import { getGrowthResultsDashboard } from "@/server/growth/operational-service";

export default async function GrowthResultsPage() {
  const fallback = "Growth results could not be opened.";
  let model: Awaited<ReturnType<typeof getGrowthResultsDashboard>> | null = null;
  let message = fallback;

  try {
    model = await getGrowthResultsDashboard(await getCurrentUser());
  } catch (error) {
    message = error instanceof Error ? error.message : fallback;
  }

  if (model) return <GrowthResultsDashboard model={model} />;
  return <GrowthAdminUnavailable message={message} />;
}
