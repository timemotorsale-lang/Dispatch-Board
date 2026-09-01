import { CooDailyWorkbook } from "@/features/advisor/service-advisor-home";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";
import { requireCurrentUser } from "@/server/auth/current-user";

type CooDailyWorkbookPageProps = {
  searchParams?: Promise<{
    closedRepairOrderId?: string | string[];
  }>;
};

export default async function CooDailyWorkbookPage({ searchParams }: CooDailyWorkbookPageProps) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const closedRepairOrderId = typeof params.closedRepairOrderId === "string" ? params.closedRepairOrderId : null;
  const model = await getServiceAdvisorWorkspace(user);

  return <CooDailyWorkbook closedRepairOrderId={closedRepairOrderId} model={JSON.parse(JSON.stringify(model))} />;
}
