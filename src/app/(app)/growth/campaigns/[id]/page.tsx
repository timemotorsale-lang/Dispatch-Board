import { GrowthCampaignAdminDetailConsole, GrowthAdminUnavailable } from "@/features/growth/growth-admin-review-console";
import { getCurrentUser } from "@/server/auth/current-user";
import { getGrowthCampaignAdminDetail } from "@/server/growth/operational-service";

export default async function GrowthCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const fallback = "Growth campaign detail could not be opened.";
  let detail: Awaited<ReturnType<typeof getGrowthCampaignAdminDetail>> | null = null;
  let message = fallback;
  try {
    const { id } = await params;
    detail = await getGrowthCampaignAdminDetail(await getCurrentUser(), id);
  } catch (error) {
    message = error instanceof Error ? error.message : fallback;
  }

  if (detail) return <GrowthCampaignAdminDetailConsole detail={detail} />;
  return <GrowthAdminUnavailable message={message} />;
}
