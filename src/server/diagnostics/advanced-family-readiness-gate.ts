import type { buildCoolingOverheatingPilotEvidencePackage } from "./cooling-overheating-pilot-hardening";
import type { buildPhase7MechanicalPilotEvidencePackage } from "./phase-7-mechanical-pilot-hardening";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_ADVANCED_FAMILY_READINESS_GATE_VERSION = "DG-G8/ADVANCED-FAMILY-READINESS-GATE/1.0.0";

export type DiagnosticAdvancedFamilyGateMode = "SHADOW_EXPANSION" | "CONTROLLED_ADVANCED_PILOT" | "PRODUCTION";
export type DiagnosticAdvancedFamilyRiskDisposition = { riskId: string; disposition: "ACCEPTED" | "MITIGATED" | "OPEN"; owner: string; note: string };
export type DiagnosticAdvancedFamilyEvidencePackage = ReturnType<typeof buildCoolingOverheatingPilotEvidencePackage> | ReturnType<typeof buildPhase7MechanicalPilotEvidencePackage>;

export type DiagnosticAdvancedFamilyReadinessGateInput = {
  occurredAt: string;
  requestedMode: DiagnosticAdvancedFamilyGateMode;
  requestedBy: string;
  coolingEvidence: ReturnType<typeof buildCoolingOverheatingPilotEvidencePackage>;
  mechanicalEvidence: ReturnType<typeof buildPhase7MechanicalPilotEvidencePackage>;
  licensedSourceActivationComplete: boolean;
  runtimeWorkflowAcceptanceComplete: boolean;
  roleTrainingComplete: boolean;
  monitoringPlanDocumented: boolean;
  rollbackPlanDocumented: boolean;
  pauseControlVerified: boolean;
  acceptanceSignedBy: string[];
  unresolvedRisks: DiagnosticAdvancedFamilyRiskDisposition[];
};

export type DiagnosticAdvancedFamilyReadinessGateItem = {
  key: string;
  label: string;
  status: "READY" | "BLOCKED" | "HOLD";
  detail: string;
};

const authorityBoundary = {
  reviewOnly: true,
  advancedPilotApprovalGranted: false,
  liveExecutionAuthorized: false,
  dispatchAuthorized: false,
  repairAuthorized: false,
  customerPresentationAuthorized: false,
  productionPromotionProhibited: true,
  aiActivationProhibited: true,
  rollbackAndPauseRequired: true
} as const;

const checksumOk = (value: string) => /^[0-9a-f]{64}$/.test(value);
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));

function evidenceReady(packageEvidence: DiagnosticAdvancedFamilyEvidencePackage) {
  return packageEvidence.status === "READY_FOR_PILOT_EVIDENCE_REVIEW"
    && checksumOk(packageEvidence.packageChecksum)
    && packageEvidence.authorityBoundary.liveExecutionAuthorized === false
    && packageEvidence.authorityBoundary.controlledPilotAuthorized === false
    && packageEvidence.authorityBoundary.productionAuthorized === false;
}

export function evaluateDiagnosticAdvancedFamilyReadinessGate(input: DiagnosticAdvancedFamilyReadinessGateInput) {
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("DG-G8 advanced-family readiness gate requires a valid timestamp.");
  const requestedBy = input.requestedBy.trim();
  const signaturesReady = new Set(input.acceptanceSignedBy.map((value) => value.trim().toUpperCase()).filter(Boolean)).size >= 2;
  const risksDisposed = input.unresolvedRisks.every((risk) => risk.riskId.trim() && risk.owner.trim() && risk.note.trim().length >= 10 && risk.disposition !== "OPEN");
  const coolingReady = evidenceReady(input.coolingEvidence);
  const mechanicalReady = evidenceReady(input.mechanicalEvidence);
  const holds = unique([
    requestedBy ? "" : "DGG8_REQUESTER_REQUIRED",
    coolingReady ? "" : "DGG8_COOLING_EVIDENCE_NOT_READY",
    mechanicalReady ? "" : "DGG8_MECHANICAL_EVIDENCE_NOT_READY",
    input.licensedSourceActivationComplete ? "" : "DGG8_LICENSED_SOURCE_ACTIVATION_REQUIRED",
    input.runtimeWorkflowAcceptanceComplete ? "" : "DGG8_RUNTIME_WORKFLOW_ACCEPTANCE_REQUIRED",
    input.roleTrainingComplete ? "" : "DGG8_ROLE_TRAINING_REQUIRED",
    input.monitoringPlanDocumented ? "" : "DGG8_MONITORING_PLAN_REQUIRED",
    input.rollbackPlanDocumented ? "" : "DGG8_ROLLBACK_PLAN_REQUIRED",
    input.pauseControlVerified ? "" : "DGG8_PAUSE_CONTROL_REQUIRED",
    signaturesReady ? "" : "DGG8_ACCEPTANCE_SIGNATURES_REQUIRED",
    risksDisposed ? "" : "DGG8_RISK_DISPOSITION_REQUIRED",
    input.requestedMode === "PRODUCTION" ? "DGG8_PRODUCTION_PROMOTION_NOT_AUTHORIZED" : ""
  ]);
  const reviewEligible = holds.length === 0 && input.requestedMode === "CONTROLLED_ADVANCED_PILOT";
  const shadowExpansionReady = coolingReady && mechanicalReady && input.requestedMode === "SHADOW_EXPANSION";
  const dashboard: DiagnosticAdvancedFamilyReadinessGateItem[] = [
    { key: "COOLING_EVIDENCE", label: "Cooling/overheating evidence package", status: coolingReady ? "READY" : "BLOCKED", detail: `${input.coolingEvidence.status}; ${input.coolingEvidence.evidenceRecords.length} evidence records.` },
    { key: "MECHANICAL_EVIDENCE", label: "Brake, HVAC, and misfire evidence package", status: mechanicalReady ? "READY" : "BLOCKED", detail: `${input.mechanicalEvidence.status}; ${input.mechanicalEvidence.evidenceRecords.length} evidence records.` },
    { key: "LICENSED_SOURCES", label: "Licensed source activation", status: input.licensedSourceActivationComplete ? "READY" : "HOLD", detail: "Advanced-family source activation must be recorded before pilot review." },
    { key: "RUNTIME_ACCEPTANCE", label: "Runtime workflow acceptance", status: input.runtimeWorkflowAcceptanceComplete ? "READY" : "HOLD", detail: "Technician, manager, browser, accessibility, and degraded-state workflow evidence." },
    { key: "MONITORING_ROLLBACK", label: "Monitoring, rollback, and pause", status: input.monitoringPlanDocumented && input.rollbackPlanDocumented && input.pauseControlVerified ? "READY" : "HOLD", detail: "Advanced shadow behavior must be observable, pausable, and reversible." },
    { key: "TRAINING_RISK", label: "Training, signatures, and risk disposition", status: input.roleTrainingComplete && signaturesReady && risksDisposed ? "READY" : "HOLD", detail: "Role training, multi-role acceptance, and owned risk disposition are mandatory." }
  ];
  const result = {
    version: DIAGNOSTIC_ADVANCED_FAMILY_READINESS_GATE_VERSION,
    occurredAt: occurredAt.toISOString(),
    requestedMode: input.requestedMode,
    requestedBy,
    dashboardStatus: reviewEligible ? "ADVANCED_PILOT_REVIEW_ELIGIBLE" as const : shadowExpansionReady ? "SHADOW_EXPANSION_READY" as const : "BLOCKED" as const,
    gateDecision: input.requestedMode === "PRODUCTION" ? "PRODUCTION_PROHIBITED" as const : reviewEligible ? "READY_FOR_ADVANCED_PILOT_REVIEW" as const : "HELD" as const,
    dashboard,
    holdCodes: holds,
    warningCodes: unique([
      "DGG8_READY_FOR_REVIEW_IS_NOT_PILOT_APPROVAL",
      "DGG8_ADVANCED_FAMILIES_REMAIN_SHADOW_ONLY",
      input.requestedMode === "SHADOW_EXPANSION" ? "DGG8_SHADOW_EXPANSION_NO_OPERATIONAL_AUTHORITY" : ""
    ]),
    metrics: {
      coolingAcknowledgements: input.coolingEvidence.history.recordCount,
      coolingCases: input.coolingEvidence.history.caseCount,
      mechanicalAcknowledgements: input.mechanicalEvidence.history.recordCount,
      mechanicalCases: input.mechanicalEvidence.history.caseCount,
      mechanicalReviewedFamilies: input.mechanicalEvidence.history.reviewedFamilies.length,
      totalEvidenceRecords: input.coolingEvidence.evidenceRecords.length + input.mechanicalEvidence.evidenceRecords.length
    },
    evidenceChecksums: {
      coolingPackageChecksum: input.coolingEvidence.packageChecksum,
      mechanicalPackageChecksum: input.mechanicalEvidence.packageChecksum
    },
    authorityBoundary
  };
  return { ...result, gateChecksum: hashEnterpriseCommand({ input, result }) };
}
