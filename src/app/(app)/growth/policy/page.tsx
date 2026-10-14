import { GrowthAdminUnavailable } from "@/features/growth/growth-admin-review-console";
import { GrowthPolicyControlCenter } from "@/features/growth/growth-policy-control-center";
import { getCurrentUser } from "@/server/auth/current-user";
import { getGrowthPolicyControlCenter } from "@/server/growth/policy-control-center";

export default async function GrowthPolicyPage() {
  const fallback = "Growth policy review requires manager access.";
  let model: Awaited<ReturnType<typeof getGrowthPolicyControlCenter>> | null = null;
  let message = fallback;

  try {
    const user = await getCurrentUser();
    model = await getGrowthPolicyControlCenter(user);
  } catch (error) {
    message = error instanceof Error ? error.message : fallback;
  }

  if (!model) return <GrowthAdminUnavailable message={message} />;
  return <GrowthPolicyControlCenter model={model} />;
}
