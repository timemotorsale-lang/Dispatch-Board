import { GrowthAdminUnavailable } from "@/features/growth/growth-admin-review-console";
import { GrowthPolicyControlCenter } from "@/features/growth/growth-policy-control-center";
import { getCurrentUser } from "@/server/auth/current-user";
import { canOpenGrowthAdmin, growthRoleForUser } from "@/server/growth/operational-service";
import { buildGrowthPolicyControlCenterModel } from "@/server/growth/policy-control-center";

export default async function GrowthPolicyPage() {
  const fallback = "Growth policy review requires manager access.";
  let canOpen = false;
  let message = fallback;
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    canOpen = canOpenGrowthAdmin(growthRoleForUser(user));
  } catch (error) {
    message = error instanceof Error ? error.message : fallback;
  }

  if (!canOpen) return <GrowthAdminUnavailable message={message} />;
  return <GrowthPolicyControlCenter model={buildGrowthPolicyControlCenterModel()} />;
}
