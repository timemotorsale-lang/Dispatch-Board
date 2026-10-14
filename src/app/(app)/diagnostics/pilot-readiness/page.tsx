import { DiagnosticRelease4AcceptanceDashboard, DiagnosticRelease4DashboardRestricted } from "@/features/diagnostics/release-4-acceptance-dashboard";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDiagnosticRelease4PilotReadiness } from "@/server/diagnostics/release-4-pilot-evidence-repository";
import { canReviewWorkflows } from "@/server/policies/access";

export default async function DiagnosticsPilotReadinessPage() {
  const user = await requireCurrentUser();
  if (!canReviewWorkflows(user)) return <DiagnosticRelease4DashboardRestricted />;

  const model = await getDiagnosticRelease4PilotReadiness(user);
  return <DiagnosticRelease4AcceptanceDashboard evidenceRepositoryChecksum={model.evidenceRepositoryChecksum} evidenceRepositoryStatus={model.evidenceRepositoryStatus} result={model.result} />;
}
