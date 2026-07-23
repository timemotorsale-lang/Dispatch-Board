import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import type { DiagnosticRelease4OperationalReadinessResult } from "./release-4-operational-readiness-domain";
import type { DiagnosticRelease4PilotReplayResult } from "./release-4-pilot-replay-domain";
import type { DiagnosticRelease4ReviewApprovalResult } from "./release-4-review-approval-domain";

export const DIAGNOSTIC_RELEASE_4_PILOT_GATE_VERSION = "DGN-055-056/ACCEPTANCE-DASHBOARD-PILOT-GATE/1.0.0";

export type DiagnosticPilotGateMode = "SHADOW_ONLY" | "CONTROLLED_PILOT" | "PRODUCTION";
export type DiagnosticPilotRiskDisposition = { riskId: string; disposition: "ACCEPTED" | "MITIGATED" | "OPEN"; owner: string; note: string };

export type DiagnosticRelease4PilotGateInput = {
  occurredAt: string;
  requestedMode: DiagnosticPilotGateMode;
  requestedBy: string;
  operationalReadiness: Pick<DiagnosticRelease4OperationalReadinessResult, "status" | "resultChecksum" | "packets">;
  reviewApproval: Pick<DiagnosticRelease4ReviewApprovalResult, "status" | "resultChecksum">;
  replay: Pick<DiagnosticRelease4PilotReplayResult, "status" | "resultChecksum" | "caseCount" | "metrics" | "warningCodes">;
  runtimeWorkflowAcceptanceComplete: boolean;
  roleTrainingComplete: boolean;
  monitoringPlanDocumented: boolean;
  rollbackPlanDocumented: boolean;
  pauseControlVerified: boolean;
  acceptanceSignedBy: string[];
  unresolvedRisks: DiagnosticPilotRiskDisposition[];
};

export type DiagnosticAcceptanceDashboardItem = {
  key: string;
  label: string;
  status: "READY" | "BLOCKED" | "HOLD";
  detail: string;
};

export type DiagnosticRelease4PilotGateResult = {
  version: string;
  occurredAt: string;
  dashboardStatus: "BLOCKED" | "SHADOW_ONLY" | "CONTROLLED_PILOT_ELIGIBLE";
  gateDecision: "APPROVED_FOR_CONTROLLED_PILOT" | "HELD" | "PRODUCTION_PROHIBITED";
  dashboard: DiagnosticAcceptanceDashboardItem[];
  holdCodes: string[];
  warningCodes: string[];
  metrics: DiagnosticRelease4PilotReplayResult["metrics"] & { replayCaseCount: number };
  authorityBoundary: {
    controlledPilotOnly: true;
    productionPromotionProhibited: true;
    customerFacingAutomationProhibited: true;
    aiActivationProhibited: true;
    rollbackAndPauseRequired: true;
  };
  gateChecksum: string;
};

const authorityBoundary = {
  controlledPilotOnly: true,
  productionPromotionProhibited: true,
  customerFacingAutomationProhibited: true,
  aiActivationProhibited: true,
  rollbackAndPauseRequired: true
} as const;

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const validChecksum = (value: string) => /^[0-9a-f]{64}$/.test(value);

export function evaluateDiagnosticRelease4PilotGate(input: DiagnosticRelease4PilotGateInput): DiagnosticRelease4PilotGateResult {
  const signaturesReady = new Set(input.acceptanceSignedBy.map((value) => value.trim().toUpperCase())).size >= 2;
  const risksDisposed = input.unresolvedRisks.every((risk) => risk.riskId.trim()
    && risk.owner.trim()
    && risk.note.trim().length >= 10
    && risk.disposition !== "OPEN");
  const operationalReady = input.operationalReadiness.status === "READY_FOR_REVIEW_CONTROLS" && validChecksum(input.operationalReadiness.resultChecksum);
  const reviewReady = input.reviewApproval.status === "READY_FOR_PILOT_REPLAY" && validChecksum(input.reviewApproval.resultChecksum);
  const replayReady = input.replay.status === "REPLAY_ACCEPTED" && validChecksum(input.replay.resultChecksum);
  const holds = unique([
    input.requestedBy.trim() ? "" : "DGN056_REQUESTER_REQUIRED",
    operationalReady ? "" : "DGN055_OPERATIONAL_READINESS_BLOCKED",
    reviewReady ? "" : "DGN055_REVIEW_APPROVAL_BLOCKED",
    replayReady ? "" : "DGN055_REPLAY_ACCEPTANCE_BLOCKED",
    input.runtimeWorkflowAcceptanceComplete ? "" : "DGN055_RUNTIME_WORKFLOW_ACCEPTANCE_REQUIRED",
    input.roleTrainingComplete ? "" : "DGN056_ROLE_TRAINING_REQUIRED",
    input.monitoringPlanDocumented ? "" : "DGN056_MONITORING_PLAN_REQUIRED",
    input.rollbackPlanDocumented ? "" : "DGN056_ROLLBACK_PLAN_REQUIRED",
    input.pauseControlVerified ? "" : "DGN056_PAUSE_CONTROL_REQUIRED",
    signaturesReady ? "" : "DGN056_ACCEPTANCE_SIGNATURES_REQUIRED",
    risksDisposed ? "" : "DGN056_UNRESOLVED_RISK_DISPOSITION_REQUIRED",
    input.requestedMode === "PRODUCTION" ? "DGN056_PRODUCTION_PROMOTION_NOT_AUTHORIZED" : ""
  ]);
  const controlledPilotReady = holds.length === 0 && input.requestedMode === "CONTROLLED_PILOT";
  const shadowReady = operationalReady && reviewReady && input.requestedMode === "SHADOW_ONLY";
  const dashboard: DiagnosticAcceptanceDashboardItem[] = [
    { key: "OPERATIONAL_READINESS", label: "Labor, parts, and capacity readiness", status: operationalReady ? "READY" : "BLOCKED", detail: operationalReady ? "DGN-049–051 packets are checksum-bound and reviewable." : "One or more operational packets remain blocked." },
    { key: "REVIEW_APPROVAL", label: "Draft review and manager controls", status: reviewReady ? "READY" : "BLOCKED", detail: reviewReady ? "DGN-052–053 review and approval lineage passed." : "Draft review or required approvals remain incomplete." },
    { key: "PILOT_REPLAY", label: "Representative pilot replay", status: replayReady ? "READY" : "BLOCKED", detail: `${input.replay.caseCount} replay cases recorded with labor, estimate, override, missed-item, and abstention metrics.` },
    { key: "RUNTIME_ACCEPTANCE", label: "Runtime workflow acceptance", status: input.runtimeWorkflowAcceptanceComplete ? "READY" : "HOLD", detail: "Advisor, estimator, technician, browser, and accessibility workflow evidence." },
    { key: "MONITORING_ROLLBACK", label: "Monitoring, pause, and rollback", status: input.monitoringPlanDocumented && input.rollbackPlanDocumented && input.pauseControlVerified ? "READY" : "HOLD", detail: "A controlled pilot must be observable, pausable, and reversible." },
    { key: "TRAINING_RISK", label: "Role training and risk disposition", status: input.roleTrainingComplete && signaturesReady && risksDisposed ? "READY" : "HOLD", detail: "Role training, multi-role acceptance, and owned risk disposition are mandatory." }
  ];
  const result = {
    version: DIAGNOSTIC_RELEASE_4_PILOT_GATE_VERSION,
    occurredAt: input.occurredAt,
    dashboardStatus: controlledPilotReady ? "CONTROLLED_PILOT_ELIGIBLE" as const : shadowReady ? "SHADOW_ONLY" as const : "BLOCKED" as const,
    gateDecision: input.requestedMode === "PRODUCTION" ? "PRODUCTION_PROHIBITED" as const : controlledPilotReady ? "APPROVED_FOR_CONTROLLED_PILOT" as const : "HELD" as const,
    dashboard,
    holdCodes: holds,
    warningCodes: unique([
      ...input.replay.warningCodes,
      "DGN056_CONTROLLED_PILOT_IS_NOT_PRODUCTION_APPROVAL",
      input.requestedMode === "SHADOW_ONLY" ? "DGN056_SHADOW_MODE_NO_OPERATIONAL_AUTHORITY" : ""
    ]),
    metrics: { ...input.replay.metrics, replayCaseCount: input.replay.caseCount },
    authorityBoundary
  };
  return { ...result, gateChecksum: hashEnterpriseCommand({ input, result }) };
}
