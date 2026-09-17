import { ClaimsDesk } from "@/features/inventory/claims-desk";
import { requireCurrentUser } from "@/server/auth/current-user";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import { getClaimsDeskReadModel } from "@/server/claims-workspace/service";

export default async function ClaimsDeskPage() {
  const user = await requireCurrentUser();
  const model = await getClaimsDeskReadModel(user, await claimsWorkspaceDependencies());

  return <ClaimsDesk model={model} />;
}
