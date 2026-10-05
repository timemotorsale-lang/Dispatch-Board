import { GovernedReportsWorkspace } from "@/features/inventory/governed-reports-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryGovernanceConsole } from "@/server/inventory-governance/service";
import { ReportingConsole } from "@/features/reporting/reporting-console";
import { isGeneralManager } from "@/server/policies/access";
import { reportBusinessDate } from "@/lib/reporting/calendar";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requireCurrentUser();
  if ((await searchParams).scope === "inventory") return <GovernedReportsWorkspace model={await getInventoryGovernanceConsole(user)} />;
  return <ReportingConsole userId={user.id} userName={user.name} canReview={isGeneralManager(user)} today={reportBusinessDate(new Date())} />;
}
