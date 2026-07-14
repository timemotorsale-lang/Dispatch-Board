import { EnterpriseWorkspaceLanding } from "@/components/ui/enterprise-workspace-landing";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function InsightsWorkspacePage() {
  await requireCurrentUser();
  return <EnterpriseWorkspaceLanding mockup={{ image: "/mockups/insights-workspace.png", role: "General manager and department managers", title: "Insights Workspace" }} eyebrow="Insights" title="Enterprise Insights" activeDuty="Reporting & decision support" description="A governed review surface for operational scorecards, bottlenecks, forecasts, and advisory recommendations." primaryAction={{ href: "/reports", label: "Open operating reports" }} cards={[
    { title: "Executive scorecards", description: "Review current performance, freshness, and metric lineage across the operation.", href: "/reports" },
    { title: "Bottlenecks & cohorts", description: "Find aging work, recurring constraints, and cohort patterns that need intervention.", href: "/activity" },
    { title: "Forecast review", description: "Evaluate forecast quality, uncertainty, and data confidence before relying on projections.", href: "/reports" },
    { title: "Recommendation queue", description: "Review advisory actions with evidence, confidence, and manager accountability.", href: "/manager-review" }
  ]} />;
}
