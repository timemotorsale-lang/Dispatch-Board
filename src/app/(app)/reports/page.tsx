import { requireCurrentUser } from "@/server/auth/current-user";
import { redirect } from "next/navigation";
import { ReportingConsole } from "@/features/reporting/reporting-console";
import { isGeneralManager } from "@/server/policies/access";
import { reportBusinessDate } from "@/lib/reporting/calendar";
import { parseReportingNavigation } from "@/lib/reporting/navigation";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireCurrentUser();
  const raw = await searchParams;
  if (raw.scope === "inventory") redirect("/vehicles/reports");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string") params.set(key, value);
  const today = reportBusinessDate(new Date()), canReview = isGeneralManager(user);
  return <ReportingConsole userId={user.id} userName={user.name} canReview={canReview} today={today} initialContext={parseReportingNavigation(params, today, canReview)} />;
}
