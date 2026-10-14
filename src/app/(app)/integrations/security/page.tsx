import { EnterpriseWorkspaceLanding } from "@/components/ui/enterprise-workspace-landing";
import { IntegrationSecurityWorkspace } from "@/features/inventory/integration-security-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getIntegrationSecurityConsole } from "@/server/integrations/security-service";
import { isManager } from "@/server/policies/access";

export default async function IntegrationSecurityPage() {
  const user = await requireCurrentUser();
  if (!isManager(user)) return <EnterpriseWorkspaceLanding eyebrow="Integrations" title="Security & Webhooks" activeDuty="Restricted integration administration" description="Credential references, webhook policy, and partner authorization evidence require manager authorization." primaryAction={{ href: "/integrations", label: "Return to integrations" }} cards={[]} />;
  return <IntegrationSecurityWorkspace initial={await getIntegrationSecurityConsole(user)} />;
}
