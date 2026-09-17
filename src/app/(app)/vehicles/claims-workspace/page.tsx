import { ClaimsWorkspaceReview } from "@/features/inventory/claims-workspace-review";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function ClaimsWorkspacePage() {
  await requireCurrentUser();

  return <ClaimsWorkspaceReview />;
}
