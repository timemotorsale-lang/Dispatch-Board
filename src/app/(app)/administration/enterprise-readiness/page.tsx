import { EnterpriseReadinessWorkspace } from "@/features/inventory/enterprise-readiness-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getEnterpriseReadinessConsole } from "@/server/enterprise-readiness/service";

export default async function EnterpriseReadinessPage({ searchParams }: { searchParams?: Promise<{ view?: string | string[]; pilotId?: string | string[] }> }) {
  const user = await requireCurrentUser(), params = searchParams ? await searchParams : undefined;
  return <EnterpriseReadinessWorkspace model={await getEnterpriseReadinessConsole(user)} view={Array.isArray(params?.view) ? params.view[0] : params?.view} pilotId={Array.isArray(params?.pilotId) ? params.pilotId[0] : params?.pilotId} />;
}
