import { ClaimsDesk } from "@/features/inventory/claims-desk";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function ClaimsDeskPage() {
  await requireCurrentUser();

  return <ClaimsDesk />;
}
