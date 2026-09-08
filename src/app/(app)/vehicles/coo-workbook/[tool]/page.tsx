import { notFound } from "next/navigation";

import { CooDailyWorkbook, type CooWorkbookTool } from "@/features/advisor/service-advisor-home";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";
import { requireCurrentUser } from "@/server/auth/current-user";

const toolBySlug: Record<string, CooWorkbookTool> = {
  "action-plan": "ACTION_PLAN",
  carryover: "CARRYOVER",
  checklist: "CHECKLIST",
  drafts: "DRAFTS",
  "more-tools": "MORE_TOOLS",
  "purchase-appraisal-capture": "PURCHASE_APPRAISAL_CAPTURE",
  "quick-update": "QUICK_UPDATE",
  "report-seeds": "REPORT_SEEDS",
  "staff-support": "STAFF_SUPPORT",
  "to-do-list": "TO_DO_LIST"
};

type CooWorkbookToolPageProps = {
  params: Promise<{
    tool: string;
  }>;
  searchParams?: Promise<{
    closedRepairOrderId?: string | string[];
    date?: string | string[];
  }>;
};

export default async function CooWorkbookToolPage({ params, searchParams }: CooWorkbookToolPageProps) {
  const [{ tool }, user] = await Promise.all([params, requireCurrentUser()]);
  const query = searchParams ? await searchParams : {};
  const initialTool = toolBySlug[tool];
  const closedRepairOrderId = typeof query.closedRepairOrderId === "string" ? query.closedRepairOrderId : null;
  const boardDate = typeof query.date === "string" ? query.date : undefined;

  if (!initialTool) {
    notFound();
  }

  const model = await getServiceAdvisorWorkspace(user, boardDate);

  return <CooDailyWorkbook closedRepairOrderId={closedRepairOrderId} initialTool={initialTool} model={JSON.parse(JSON.stringify(model))} />;
}
