import { ClaimsWorkspaceReview } from "@/features/inventory/claims-workspace-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import { getClaimWorkspaceReadModel } from "@/server/claims-workspace/service";

export default async function ClaimsWorkspacePage({
  searchParams
}: {
  searchParams?: Promise<{ claimId?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const model = await getClaimWorkspaceReadModel(user, params?.claimId, await claimsWorkspaceDependencies());

  return <ClaimsWorkspaceReview model={model} />;
}
