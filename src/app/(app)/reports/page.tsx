import { requireCurrentUser } from "@/server/auth/current-user";
import { redirect } from "next/navigation";
import { ReportingConsole } from "@/features/reporting/reporting-console";
import { isGeneralManager } from "@/server/policies/access";
import { reportBusinessDate } from "@/lib/reporting/calendar";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requireCurrentUser();
  if ((await searchParams).scope === "inventory") redirect("/vehicles/reports");
  return <ReportingConsole userId={user.id} userName={user.name} canReview={isGeneralManager(user)} today={reportBusinessDate(new Date())} />;
}
