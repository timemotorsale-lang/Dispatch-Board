import { redirect } from "next/navigation";

import { ClaimsWorkspaceReview } from "@/features/inventory/claims-workspace-review";
import { requireCurrentUser } from "@/server/auth/current-user";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import { ClaimsWorkspaceError, getClaimWorkspaceReadModel } from "@/server/claims-workspace/service";

export default async function ClaimsWorkspacePage({
  searchParams
}: {
  searchParams?: Promise<{ claimId?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  if (!params?.claimId) redirect("/vehicles/claims-desk");

  let model;
  try {
    model = await getClaimWorkspaceReadModel(user, params.claimId, await claimsWorkspaceDependencies());
  } catch (error) {
    if (error instanceof ClaimsWorkspaceError && error.code === "CLAIM_NOT_FOUND") redirect("/vehicles/claims-desk");
    throw error;
  }

  return <ClaimsWorkspaceReview model={model} />;
}
