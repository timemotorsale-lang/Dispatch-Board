import { DealerCenterSummary } from "@/features/dealercenter-reporting/summary";
import { requireCurrentUser } from "@/server/auth/current-user";
import { SalesConsoleEliteOperatingConsole } from "@/features/sales/sales-console-elite-operating-console";

export default async function SalesPage() {
  const user = await requireCurrentUser();
  return <><DealerCenterSummary user={user} kind="SALES" /><SalesConsoleEliteOperatingConsole /></>;
}
