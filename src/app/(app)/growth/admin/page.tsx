import { GrowthAdminReviewConsole, GrowthAdminUnavailable } from "@/features/growth/growth-admin-review-console";
import { getCurrentUser } from "@/server/auth/current-user";
import { getGrowthAdminReview } from "@/server/growth/operational-service";

export default async function GrowthAdminPage() {
  const fallback = "Growth admin review could not be opened.";
  let model: Awaited<ReturnType<typeof getGrowthAdminReview>> | null = null;
  let message = fallback;
  try {
    model = await getGrowthAdminReview(await getCurrentUser());
  } catch (error) {
    message = error instanceof Error ? error.message : fallback;
  }

  if (model) return <GrowthAdminReviewConsole model={model} />;
  return <GrowthAdminUnavailable message={message} />;
}
