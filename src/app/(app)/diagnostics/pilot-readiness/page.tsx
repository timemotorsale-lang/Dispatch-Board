import { DiagnosticRelease4AcceptanceDashboard, DiagnosticRelease4DashboardRestricted } from "@/features/diagnostics/release-4-acceptance-dashboard";
import { requireCurrentUser } from "@/server/auth/current-user";
import { evaluateDiagnosticRelease4PilotGate } from "@/server/diagnostics/release-4-pilot-gate-domain";
import { canReviewWorkflows } from "@/server/policies/access";

const zeroMetrics = {
  meanGuideVsActualLaborVariancePercent: 0,
  meanConsoleVsActualLaborVariancePercent: 0,
  meanEstimateVariancePercent: 0,
  overrideRatePercent: 0,
  missedItemRatePercent: 0,
  abstentionQualityPercent: 0
};

export default async function DiagnosticsPilotReadinessPage() {
  const user = await requireCurrentUser();
  if (!canReviewWorkflows(user)) return <DiagnosticRelease4DashboardRestricted />;

  // No durable pilot evidence repository exists yet. A deliberately blocked
  // snapshot prevents source completion from being mistaken for rollout proof.
  const result = evaluateDiagnosticRelease4PilotGate({
    occurredAt: new Date().toISOString(),
    requestedMode: "CONTROLLED_PILOT",
    requestedBy: user.id,
    operationalReadiness: { status: "BLOCKED", resultChecksum: "", packets: [] },
    reviewApproval: { status: "BLOCKED", resultChecksum: "" },
    replay: { status: "BLOCKED", resultChecksum: "", caseCount: 0, metrics: zeroMetrics, warningCodes: [] },
    runtimeWorkflowAcceptanceComplete: false,
    roleTrainingComplete: false,
    monitoringPlanDocumented: false,
    rollbackPlanDocumented: false,
    pauseControlVerified: false,
    acceptanceSignedBy: [],
    unresolvedRisks: []
  });
  return <DiagnosticRelease4AcceptanceDashboard result={result} />;
}
