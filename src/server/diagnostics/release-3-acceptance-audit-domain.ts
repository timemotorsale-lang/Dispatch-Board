import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import type { DiagnosticRelease3HandoffGateResult } from "./release-3-handoff-gates-domain";

export const DIAGNOSTIC_RELEASE_3_ACCEPTANCE_AUDIT_VERSION = "DGN-045/RELEASE-3-ACCEPTANCE-AUDIT/1.0.0";

export const DIAGNOSTIC_RELEASE_3_MILESTONES = ["DGN-035", "DGN-036", "DGN-037", "DGN-038", "DGN-039", "DGN-040", "DGN-041", "DGN-042", "DGN-043", "DGN-044"] as const;

export type DiagnosticRelease3MilestoneId = (typeof DIAGNOSTIC_RELEASE_3_MILESTONES)[number];

export type DiagnosticRelease3RolloutMode = "DOCUMENTATION_AUDIT" | "SHADOW_PILOT" | "CONTROLLED_PILOT" | "PRODUCTION";

export type DiagnosticRelease3MilestoneEvidence = {
  milestoneId: DiagnosticRelease3MilestoneId;
  implementedInSource: boolean;
  testsPassed: boolean;
  implementationRecordPublished: boolean;
};

export type DiagnosticRelease3RolloutEvidence = {
  migrationsDeployed: boolean;
  runtimeNavigationEnabled: boolean;
  browserAccessibilityAcceptanceComplete: boolean;
  advisorEstimatorAcceptanceComplete: boolean;
  technicianAcceptanceComplete: boolean;
  licensedLaborSourceApproved: boolean;
  licensedPartsPricingApproved: boolean;
  downstreamAuthorityIntegrationApproved: boolean;
  pilotDatasetApproved: boolean;
  monitoringRollbackReady: boolean;
  productionFeatureFlagEnabled: boolean;
};

export type DiagnosticRelease3AcceptanceAuditInput = {
  occurredAt: string;
  auditRequestedBy: string;
  requestedRolloutMode: DiagnosticRelease3RolloutMode;
  release3HandoffGateResult: Pick<DiagnosticRelease3HandoffGateResult, "status" | "resultChecksum" | "authorityBoundary" | "handoffPackets">;
  milestoneEvidence: DiagnosticRelease3MilestoneEvidence[];
  rolloutEvidence: DiagnosticRelease3RolloutEvidence;
};

export type DiagnosticRelease3AcceptanceChecklistItem = {
  key: string;
  status: "READY" | "MISSING" | "GATED";
  requiredBefore: "RELEASE4_IMPLEMENTATION" | "SHADOW_PILOT" | "CONTROLLED_PILOT" | "PRODUCTION";
  summary: string;
};

export type DiagnosticRelease3AcceptanceAuditResult = {
  version: string;
  occurredAt: string;
  status: "ACCEPTED_FOR_RELEASE4_IMPLEMENTATION" | "BLOCKED";
  sourceFoundationStatus: "COMPLETE" | "INCOMPLETE";
  rolloutDisposition: "DOCUMENTATION_ONLY" | "SHADOW_PILOT_BLOCKED" | "CONTROLLED_PILOT_BLOCKED" | "PRODUCTION_BLOCKED";
  reasonCodes: string[];
  warningCodes: string[];
  checklist: DiagnosticRelease3AcceptanceChecklistItem[];
  completedMilestones: DiagnosticRelease3MilestoneId[];
  missingMilestones: DiagnosticRelease3MilestoneId[];
  requiredNextMilestones: string[];
  authorityBoundary: {
    auditOnly: true;
    sourceAcceptanceDoesNotAuthorizeProduction: true;
    customerFacingUseProhibited: true;
    insurerSubmissionProhibited: true;
    estimateMutationProhibited: true;
    partsOrderProhibited: true;
    dispatchSchedulingMutationProhibited: true;
    laborTimeFinalAuthorityProhibited: true;
    aiActivationProhibited: true;
  };
  auditChecksum: string;
};

const authorityBoundary = {
  auditOnly: true,
  sourceAcceptanceDoesNotAuthorizeProduction: true,
  customerFacingUseProhibited: true,
  insurerSubmissionProhibited: true,
  estimateMutationProhibited: true,
  partsOrderProhibited: true,
  dispatchSchedulingMutationProhibited: true,
  laborTimeFinalAuthorityProhibited: true,
  aiActivationProhibited: true
} as const;

const requiredNextMilestones = [
  "DGN-046-048_CONSOLE_WORKFLOW_INTEGRATION",
  "DGN-049-051_OPERATIONAL_READINESS",
  "DGN-052-053_REVIEW_APPROVAL_CONTROLS",
  "DGN-054-056_PILOT_ACCEPTANCE_GATE"
];

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

function validChecksum(value: string) {
  return /^[0-9a-f]{64}$/.test(value);
}

function completedMilestones(evidence: DiagnosticRelease3MilestoneEvidence[]) {
  const byId = new Map(evidence.map((item) => [item.milestoneId, item]));
  return DIAGNOSTIC_RELEASE_3_MILESTONES.filter((milestoneId) => {
    const item = byId.get(milestoneId);
    return item?.implementedInSource === true && item.testsPassed === true && item.implementationRecordPublished === true;
  });
}

function checklist(input: DiagnosticRelease3AcceptanceAuditInput, sourceFoundationComplete: boolean): DiagnosticRelease3AcceptanceChecklistItem[] {
  const rollout = input.rolloutEvidence;
  return [
    {
      key: "RELEASE3_SOURCE_FOUNDATION",
      status: sourceFoundationComplete ? "READY" : "MISSING",
      requiredBefore: "RELEASE4_IMPLEMENTATION",
      summary: "DGN-035 through DGN-044 must have source implementation, tests, and implementation records."
    },
    {
      key: "DGN044_HANDOFF_GATE_READY",
      status: input.release3HandoffGateResult.status === "READY_FOR_HANDOFF_REVIEW" && validChecksum(input.release3HandoffGateResult.resultChecksum) ? "READY" : "MISSING",
      requiredBefore: "RELEASE4_IMPLEMENTATION",
      summary: "Final Release 3 handoff packets must be checksum-bound and ready for downstream review."
    },
    {
      key: "RUNTIME_NAVIGATION",
      status: rollout.runtimeNavigationEnabled && rollout.migrationsDeployed ? "READY" : "GATED",
      requiredBefore: "SHADOW_PILOT",
      summary: "The console must be integrated into runtime navigation with required migrations deployed before shadow pilot use."
    },
    {
      key: "ADVISOR_TECHNICIAN_ACCEPTANCE",
      status: rollout.advisorEstimatorAcceptanceComplete && rollout.technicianAcceptanceComplete && rollout.browserAccessibilityAcceptanceComplete ? "READY" : "GATED",
      requiredBefore: "CONTROLLED_PILOT",
      summary: "Advisor/estimator, technician, and browser/accessibility acceptance must pass before controlled pilot."
    },
    {
      key: "LABOR_PARTS_SOURCE_READINESS",
      status: rollout.licensedLaborSourceApproved && rollout.licensedPartsPricingApproved ? "READY" : "GATED",
      requiredBefore: "CONTROLLED_PILOT",
      summary: "Labor times and parts/pricing must remain draft intelligence until approved sources and review boundaries are ready."
    },
    {
      key: "DOWNSTREAM_AUTHORITY_INTEGRATION",
      status: rollout.downstreamAuthorityIntegrationApproved ? "READY" : "GATED",
      requiredBefore: "CONTROLLED_PILOT",
      summary: "Repair estimate, parts, dispatch, customer/insurance, and QC authorities must explicitly accept handoff packets."
    },
    {
      key: "PILOT_MEASUREMENT_AND_ROLLBACK",
      status: rollout.pilotDatasetApproved && rollout.monitoringRollbackReady ? "READY" : "GATED",
      requiredBefore: "CONTROLLED_PILOT",
      summary: "Pilot replay cases, monitoring, rollback, and pause controls must be ready before controlled shop use."
    },
    {
      key: "PRODUCTION_ACTIVATION",
      status: "GATED",
      requiredBefore: "PRODUCTION",
      summary: "DGN-045 cannot authorize production; production requires later pilot acceptance and explicit promotion."
    }
  ];
}

function rolloutDisposition(requestedRolloutMode: DiagnosticRelease3RolloutMode) {
  if (requestedRolloutMode === "PRODUCTION") return "PRODUCTION_BLOCKED" as const;
  if (requestedRolloutMode === "CONTROLLED_PILOT") return "CONTROLLED_PILOT_BLOCKED" as const;
  if (requestedRolloutMode === "SHADOW_PILOT") return "SHADOW_PILOT_BLOCKED" as const;
  return "DOCUMENTATION_ONLY" as const;
}

export function evaluateDiagnosticRelease3AcceptanceAudit(input: DiagnosticRelease3AcceptanceAuditInput): DiagnosticRelease3AcceptanceAuditResult {
  const completed = completedMilestones(input.milestoneEvidence);
  const missing = DIAGNOSTIC_RELEASE_3_MILESTONES.filter((milestoneId) => !completed.includes(milestoneId));
  const sourceFoundationComplete = missing.length === 0;
  const handoffReady = input.release3HandoffGateResult.status === "READY_FOR_HANDOFF_REVIEW" && validChecksum(input.release3HandoffGateResult.resultChecksum);
  const handoffBoundaryIntact = input.release3HandoffGateResult.authorityBoundary.advisoryOnly
    && input.release3HandoffGateResult.authorityBoundary.estimateMutationProhibited
    && input.release3HandoffGateResult.authorityBoundary.customerPresentationProhibited
    && input.release3HandoffGateResult.authorityBoundary.insurerSubmissionProhibited
    && input.release3HandoffGateResult.authorityBoundary.partsOrderProhibited
    && input.release3HandoffGateResult.authorityBoundary.dispatchMutationProhibited
    && input.release3HandoffGateResult.authorityBoundary.qcClosureProhibited;
  const productionRequested = input.requestedRolloutMode === "PRODUCTION";
  const acceptedForRelease4 = sourceFoundationComplete && handoffReady && handoffBoundaryIntact && input.auditRequestedBy.trim().length > 0 && !productionRequested;
  const result = {
    version: DIAGNOSTIC_RELEASE_3_ACCEPTANCE_AUDIT_VERSION,
    occurredAt: input.occurredAt,
    status: acceptedForRelease4 ? "ACCEPTED_FOR_RELEASE4_IMPLEMENTATION" as const : "BLOCKED" as const,
    sourceFoundationStatus: sourceFoundationComplete ? "COMPLETE" as const : "INCOMPLETE" as const,
    rolloutDisposition: rolloutDisposition(input.requestedRolloutMode),
    reasonCodes: unique([
      input.auditRequestedBy.trim() ? "" : "DGN045_AUDITOR_REQUIRED",
      sourceFoundationComplete ? "" : "DGN045_RELEASE3_SOURCE_EVIDENCE_INCOMPLETE",
      handoffReady ? "" : "DGN045_RELEASE3_HANDOFF_GATE_READY_RESULT_REQUIRED",
      handoffBoundaryIntact ? "" : "DGN045_RELEASE3_HANDOFF_AUTHORITY_BOUNDARY_REQUIRED",
      productionRequested ? "DGN045_PRODUCTION_ROLLOUT_NOT_AUTHORIZED" : ""
    ]),
    warningCodes: unique([
      input.requestedRolloutMode !== "DOCUMENTATION_AUDIT" ? "DGN045_REQUESTED_ROLLOUT_REMAINS_GATED" : "",
      input.rolloutEvidence.productionFeatureFlagEnabled ? "DGN045_PRODUCTION_FEATURE_FLAG_MUST_REMAIN_DISABLED" : "",
      input.rolloutEvidence.licensedLaborSourceApproved ? "" : "DGN045_LABOR_TIME_REMAINS_DRAFT_INTELLIGENCE",
      input.rolloutEvidence.licensedPartsPricingApproved ? "" : "DGN045_PARTS_PRICING_REMAINS_REVIEW_REQUIRED",
      input.rolloutEvidence.downstreamAuthorityIntegrationApproved ? "" : "DGN045_DOWNSTREAM_AUTHORITY_INTEGRATION_PENDING"
    ]),
    checklist: checklist(input, sourceFoundationComplete),
    completedMilestones: completed,
    missingMilestones: missing,
    requiredNextMilestones,
    authorityBoundary
  };
  return { ...result, auditChecksum: hashEnterpriseCommand({ input, result }) };
}
