import { EnterpriseWorkspaceLanding } from "@/components/ui/enterprise-workspace-landing";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";

export default async function IntegrationsWorkspacePage() {
  const user = await requireCurrentUser();
  if (!isManager(user)) return <EnterpriseWorkspaceLanding eyebrow="Integrations" title="Integration Workbench" activeDuty="Read-only system visibility" description="Your account can view operational signals, while provider mutations and conflict resolution require manager access." primaryAction={{ href: "/activity", label: "Open activity signals" }} cards={[{ title: "Provider health", description: "Monitor recent system events and freshness signals.", href: "/activity" }]} />;
  return <EnterpriseWorkspaceLanding eyebrow="Integrations" title="Integration Workbench" activeDuty="Integration administration" description="Keep external system boundaries visible, reconciled, and accountable from one manager workspace." primaryAction={{ href: "/activity", label: "Open integration activity" }} cards={[
    { title: "Systems registry", description: "Review connected systems, source authority, and ownership boundaries.", href: "/activity" },
    { title: "Reconciliation conflicts", description: "Find mismatches, stale records, duplicates, and out-of-balance events.", href: "/activity" },
    { title: "Provider health", description: "Inspect freshness, delivery signals, and failed integration events.", href: "/activity" },
    { title: "Partner API governance", description: "Review governed partner access and integration operating activity.", href: "/settings/team" }
  ]} />;
}
