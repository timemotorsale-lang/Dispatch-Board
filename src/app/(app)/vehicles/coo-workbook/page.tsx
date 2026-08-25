import { CooDailyWorkbook } from "@/features/advisor/service-advisor-home";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function CooDailyWorkbookPage() {
  const user = await requireCurrentUser();
  const model = await getServiceAdvisorWorkspace(user);

  return <CooDailyWorkbook model={JSON.parse(JSON.stringify(model))} />;
}
