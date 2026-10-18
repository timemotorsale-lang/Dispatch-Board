import { requireCurrentUser } from "@/server/auth/current-user";
import { RepairCoverageReview } from "@/features/prototype/repair-explorer/repair-coverage-review";

export const metadata = { title: "Ten-system coverage review | Dispatch Board" };

export default async function RepairCoveragePage() {
  await requireCurrentUser("/prototype/repair-coverage");
  return <RepairCoverageReview />;
}
