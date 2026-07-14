import { EnterpriseWorkspaceLanding } from "@/components/ui/enterprise-workspace-landing";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canManageSettings } from "@/server/policies/access";

export default async function AdministrationWorkspacePage() {
  const user = await requireCurrentUser();
  if (!canManageSettings(user)) return <EnterpriseWorkspaceLanding eyebrow="Administration" title="Enterprise Administration" activeDuty="Operational access" description="Administration controls are restricted to authorized managers. Your current account remains able to use its assigned operating workspaces." primaryAction={{ href: "/board", label: "Return to Command Center" }} cards={[{ title: "Your operating access", description: "Review assigned work and operational updates.", href: "/my-tasks" }]} />;
  return <EnterpriseWorkspaceLanding eyebrow="Administration" title="Enterprise Administration" activeDuty="Governance & resilience" description="Manager controls for people, policies, evidence, background operations, rollout gates, and recovery readiness." primaryAction={{ href: "/settings/team", label: "Open team administration" }} cards={[
    { title: "People, roles & duties", description: "Manage users, role assignments, and delegated capabilities.", href: "/settings/team" },
    { title: "Audit & evidence", description: "Keep decision history, retention, and evidence review close to daily operations.", href: "/activity" },
    { title: "Background operations", description: "Monitor queued work, failed events, and projection freshness.", href: "/activity" },
    { title: "Rollout & recovery", description: "Review controlled rollout posture and operational readiness evidence.", href: "/settings" }
  ]} />;
}
