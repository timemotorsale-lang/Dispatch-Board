import { ServiceAdvisorHome } from "@/features/advisor/service-advisor-home";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";

type AdvisorPageProps = {
  searchParams?: Promise<{
    inbox?: string;
    queue?: string;
  }>;
};

export default async function AdvisorPage({ searchParams }: AdvisorPageProps) {
  const [user, focusParams] = await Promise.all([
    requireCurrentUser(),
    searchParams
  ]);
  const model = await getServiceAdvisorWorkspace(user);
  return <ServiceAdvisorHome initialFilter={focusParams?.queue === "authorization" ? "AUTHORIZATION" : "ATTENTION"} initialSection={focusParams?.inbox ? "INBOX" : "WORK"} model={JSON.parse(JSON.stringify(model))} />;
}
