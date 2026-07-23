import type { buildPhase8ElectricalPilotEvidencePackage } from "./phase-8-electrical-pilot-hardening";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_PHASE_8_READINESS_GATE_VERSION = "DG-G9/PHASE-8-ELECTRICAL-READINESS-GATE/1.0.0";

export type DiagnosticPhase8GateMode = "SHADOW_EXPANSION" | "CONTROLLED_PHASE_8_PILOT" | "PRODUCTION";
export type DiagnosticPhase8RiskDisposition = { riskId: string; disposition: "ACCEPTED" | "MITIGATED" | "OPEN"; owner: string; note: string };

export type DiagnosticPhase8ReadinessGateInput = {
  occurredAt: string;
  requestedMode: DiagnosticPhase8GateMode;
  requestedBy: string;
  phase8Evidence: ReturnType<typeof buildPhase8ElectricalPilotEvidencePackage>;
  licensedSourceActivationComplete: boolean;
  runtimeWorkflowAcceptanceComplete: boolean;
  roleTrainingComplete: boolean;
  monitoringPlanDocumented: boolean;
  rollbackPlanDocumented: boolean;
  pauseControlVerified: boolean;
  acceptanceSignedBy: string[];
  unresolvedRisks: DiagnosticPhase8RiskDisposition[];
};

const authorityBoundary = { reviewOnly: true, phase8PilotApprovalGranted: false, liveExecutionAuthorized: false, unsafeProbingAuthorized: false, roadTestAuthorized: false, dispatchAuthorized: false, repairAuthorized: false, customerPresentationAuthorized: false, productionPromotionProhibited: true, aiActivationProhibited: true, rollbackAndPauseRequired: true } as const;
const checksumOk = (value: string) => /^[0-9a-f]{64}$/.test(value);
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));

export function evaluateDiagnosticPhase8ReadinessGate(input: DiagnosticPhase8ReadinessGateInput) {
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("DG-G9 Phase 8 readiness gate requires a valid timestamp.");
  const requestedBy = input.requestedBy.trim();
  const evidenceReady = input.phase8Evidence.status === "READY_FOR_PILOT_EVIDENCE_REVIEW" && checksumOk(input.phase8Evidence.packageChecksum) && input.phase8Evidence.authorityBoundary.liveExecutionAuthorized === false && input.phase8Evidence.authorityBoundary.unsafeProbingAuthorized === false && input.phase8Evidence.authorityBoundary.roadTestAuthorized === false && input.phase8Evidence.authorityBoundary.productionAuthorized === false;
  const signaturesReady = new Set(input.acceptanceSignedBy.map((value) => value.trim().toUpperCase()).filter(Boolean)).size >= 2;
  const risksDisposed = input.unresolvedRisks.every((risk) => risk.riskId.trim() && risk.owner.trim() && risk.note.trim().length >= 10 && risk.disposition !== "OPEN");
  const holds = unique([
    requestedBy ? "" : "DGG9_REQUESTER_REQUIRED",
    evidenceReady ? "" : "DGG9_PHASE_8_EVIDENCE_NOT_READY",
    input.licensedSourceActivationComplete ? "" : "DGG9_LICENSED_SOURCE_ACTIVATION_REQUIRED",
    input.runtimeWorkflowAcceptanceComplete ? "" : "DGG9_RUNTIME_WORKFLOW_ACCEPTANCE_REQUIRED",
    input.roleTrainingComplete ? "" : "DGG9_ROLE_TRAINING_REQUIRED",
    input.monitoringPlanDocumented ? "" : "DGG9_MONITORING_PLAN_REQUIRED",
    input.rollbackPlanDocumented ? "" : "DGG9_ROLLBACK_PLAN_REQUIRED",
    input.pauseControlVerified ? "" : "DGG9_PAUSE_CONTROL_REQUIRED",
    signaturesReady ? "" : "DGG9_ACCEPTANCE_SIGNATURES_REQUIRED",
    risksDisposed ? "" : "DGG9_RISK_DISPOSITION_REQUIRED",
    input.requestedMode === "PRODUCTION" ? "DGG9_PRODUCTION_PROMOTION_NOT_AUTHORIZED" : ""
  ]);
  const reviewEligible = holds.length === 0 && input.requestedMode === "CONTROLLED_PHASE_8_PILOT";
  const shadowExpansionReady = evidenceReady && input.requestedMode === "SHADOW_EXPANSION";
  const dashboard = [
    { key: "PHASE_8_EVIDENCE", label: "Phase 8 evidence package", status: evidenceReady ? "READY" : "BLOCKED", detail: `${input.phase8Evidence.status}; ${input.phase8Evidence.evidenceRecords.length} evidence records.` },
    { key: "LICENSED_SOURCES", label: "Licensed source activation", status: input.licensedSourceActivationComplete ? "READY" : "HOLD", detail: "Electrical, waveform, and intermittent sources must be activated before pilot review." },
    { key: "RUNTIME_ACCEPTANCE", label: "Runtime workflow acceptance", status: input.runtimeWorkflowAcceptanceComplete ? "READY" : "HOLD", detail: "Technician, manager, browser, accessibility, and degraded-state workflow evidence." },
    { key: "MONITORING_ROLLBACK", label: "Monitoring, rollback, and pause", status: input.monitoringPlanDocumented && input.rollbackPlanDocumented && input.pauseControlVerified ? "READY" : "HOLD", detail: "Phase 8 shadow behavior must be observable, pausable, and reversible." },
    { key: "TRAINING_RISK", label: "Training, signatures, and risk disposition", status: input.roleTrainingComplete && signaturesReady && risksDisposed ? "READY" : "HOLD", detail: "Role training, multi-role acceptance, and owned risk disposition are mandatory." }
  ] as const;
  const result = {
    version: DIAGNOSTIC_PHASE_8_READINESS_GATE_VERSION,
    occurredAt: occurredAt.toISOString(),
    requestedMode: input.requestedMode,
    requestedBy,
    dashboardStatus: reviewEligible ? "PHASE_8_PILOT_REVIEW_ELIGIBLE" as const : shadowExpansionReady ? "SHADOW_EXPANSION_READY" as const : "BLOCKED" as const,
    gateDecision: input.requestedMode === "PRODUCTION" ? "PRODUCTION_PROHIBITED" as const : reviewEligible ? "READY_FOR_PHASE_8_PILOT_REVIEW" as const : "HELD" as const,
    dashboard,
    holdCodes: holds,
    warningCodes: unique(["DGG9_READY_FOR_REVIEW_IS_NOT_PILOT_APPROVAL", "DGG9_PHASE_8_REMAINS_SHADOW_ONLY", input.requestedMode === "SHADOW_EXPANSION" ? "DGG9_SHADOW_EXPANSION_NO_OPERATIONAL_AUTHORITY" : ""]),
    metrics: { acknowledgementCount: input.phase8Evidence.history.recordCount, caseCount: input.phase8Evidence.history.caseCount, reviewedFamilies: input.phase8Evidence.history.reviewedFamilies.length, evidenceRecords: input.phase8Evidence.evidenceRecords.length },
    evidenceChecksums: { phase8PackageChecksum: input.phase8Evidence.packageChecksum },
    authorityBoundary
  };
  return { ...result, gateChecksum: hashEnterpriseCommand({ input, result }) };
}
