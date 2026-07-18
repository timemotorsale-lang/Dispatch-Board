import { EnterpriseWorkspaceLanding } from "@/components/ui/enterprise-workspace-landing";
import { IntegrationEcosystemWorkspace } from "@/features/inventory/integration-ecosystem-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getR11IntegrationEcosystem } from "@/server/integrations/r11-service";
import { isManager } from "@/server/policies/access";

export default async function IntegrationsWorkspacePage({ searchParams }: { searchParams?: Promise<{ view?: string | string[] }> }) {
  const user = await requireCurrentUser();
  if (!isManager(user)) return <EnterpriseWorkspaceLanding eyebrow="Integrations" title="Integration Ecosystem" activeDuty="Restricted provider boundary" description="Provider records, reconciliation evidence, and sandbox commands require manager authorization." primaryAction={{ href: "/activity", label: "Open authorized activity" }} cards={[{ title: "Operational activity", description: "Use your assigned operating workspace and visible system signals.", href: "/activity" }]} />;
  const params = searchParams ? await searchParams : undefined, view = Array.isArray(params?.view) ? params.view[0] : params?.view;
  return <IntegrationEcosystemWorkspace initial={await getR11IntegrationEcosystem(user)} initialView={view} />;
}
