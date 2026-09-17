import { ClaimsDesk } from "@/features/inventory/claims-desk";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getClaimsDeskReadModel } from "@/server/claims-workspace/service";

export default async function ClaimsDeskPage() {
  const user = await requireCurrentUser();
  const model = await getClaimsDeskReadModel(user);

  return <ClaimsDesk model={model} />;
}
