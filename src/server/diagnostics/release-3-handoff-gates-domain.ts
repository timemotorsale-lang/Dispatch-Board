import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import type { DiagnosticEstimateStrategyOutput } from "./estimate-strategy-engine";

export const DIAGNOSTIC_RELEASE_3_HANDOFF_GATES_VERSION = "DGN-044/RELEASE-3-HANDOFF-GATES/1.0.0";

export type DiagnosticRelease3HandoffGateInput = {
  diagnosticCaseId: string;
  repairOrderId: string;
  conclusionChecksum: string;
  repairHandoffChecksum: string;
  selectedStrategyOutput: DiagnosticEstimateStrategyOutput;
  occurredAt: string;
  advisorReviewed: boolean;
  managerReviewed?: boolean;
};

export type DiagnosticRelease3HandoffPacket = {
  targetAuthority: "REPAIR_ESTIMATE" | "PARTS" | "DISPATCH_CAPACITY" | "CUSTOMER_OR_INSURANCE_REVIEW" | "QUALITY_CONTROL";
  status: "READY_FOR_DOWNSTREAM_REVIEW" | "BLOCKED";
  payloadSummary: string;
  lineageChecksums: string[];
  blockedMutationCodes: string[];
  reviewRequiredCodes: string[];
};

export type DiagnosticRelease3HandoffGateResult = {
  version: string;
  occurredAt: string;
  status: "READY_FOR_HANDOFF_REVIEW" | "BLOCKED";
  reasonCodes: string[];
  warningCodes: string[];
  handoffPackets: DiagnosticRelease3HandoffPacket[];
  authorityBoundary: {
    advisoryOnly: true;
    estimateMutationProhibited: true;
    customerPresentationProhibited: true;
    insurerSubmissionProhibited: true;
    authorizationRequestProhibited: true;
    partsOrderProhibited: true;
    partsReservationProhibited: true;
    dispatchMutationProhibited: true;
    schedulingMutationProhibited: true;
    qcClosureProhibited: true;
  };
  resultChecksum: string;
};

const authorityBoundary = {
  advisoryOnly: true,
  estimateMutationProhibited: true,
  customerPresentationProhibited: true,
  insurerSubmissionProhibited: true,
  authorizationRequestProhibited: true,
  partsOrderProhibited: true,
  partsReservationProhibited: true,
  dispatchMutationProhibited: true,
  schedulingMutationProhibited: true,
  qcClosureProhibited: true
} as const;

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

function validChecksum(value: string) {
  return /^[0-9a-f]{64}$/.test(value);
}

function packets(input: DiagnosticRelease3HandoffGateInput, blocked: boolean): DiagnosticRelease3HandoffPacket[] {
  const output = input.selectedStrategyOutput;
  const status = blocked ? "BLOCKED" as const : "READY_FOR_DOWNSTREAM_REVIEW" as const;
  const lineageChecksums = unique([
    input.conclusionChecksum,
    input.repairHandoffChecksum,
    output.outputChecksum,
    output.laborGuideResultChecksum,
    output.economicsResultChecksum,
    output.capacityExplanationResultChecksum
  ]);
  return [
    {
      targetAuthority: "REPAIR_ESTIMATE",
      status,
      payloadSummary: `${output.draftLines.length} draft lines, ${output.totals.totalBeforeTaxCents} cents before final tax/fees.`,
      lineageChecksums,
      blockedMutationCodes: ["HANDOFF_REPAIR_ESTIMATE_MUTATION_PROHIBITED"],
      reviewRequiredCodes: ["HANDOFF_REPAIR_ESTIMATE_AUTHORITY_REVIEW_REQUIRED"]
    },
    {
      targetAuthority: "PARTS",
      status,
      payloadSummary: `${output.partDemandCandidates.length} demand candidates; no reservation or purchase authorized.`,
      lineageChecksums,
      blockedMutationCodes: ["HANDOFF_PARTS_ORDER_PROHIBITED", "HANDOFF_PARTS_RESERVATION_PROHIBITED"],
      reviewRequiredCodes: output.partDemandCandidates.length ? ["HANDOFF_PARTS_AUTHORITY_REVIEW_REQUIRED"] : []
    },
    {
      targetAuthority: "DISPATCH_CAPACITY",
      status,
      payloadSummary: `Capacity risk ${output.capacityRisk}; projected cycle time ${output.cycleTimeDays} days.`,
      lineageChecksums,
      blockedMutationCodes: ["HANDOFF_DISPATCH_MUTATION_PROHIBITED", "HANDOFF_SCHEDULING_MUTATION_PROHIBITED"],
      reviewRequiredCodes: ["HANDOFF_DISPATCH_CAPACITY_REVIEW_REQUIRED"]
    },
    {
      targetAuthority: "CUSTOMER_OR_INSURANCE_REVIEW",
      status,
      payloadSummary: `${output.explanationPackages.length} draft explanation packages; edit and authority review required.`,
      lineageChecksums,
      blockedMutationCodes: ["HANDOFF_CUSTOMER_PRESENTATION_PROHIBITED", "HANDOFF_INSURER_SUBMISSION_PROHIBITED", "HANDOFF_AUTHORIZATION_REQUEST_PROHIBITED"],
      reviewRequiredCodes: ["HANDOFF_ADVISOR_EXPLANATION_REVIEW_REQUIRED"]
    },
    {
      targetAuthority: "QUALITY_CONTROL",
      status,
      payloadSummary: `${output.laborGuideRecommendations.length} repair operations require downstream verification planning.`,
      lineageChecksums,
      blockedMutationCodes: ["HANDOFF_QC_CLOSURE_PROHIBITED"],
      reviewRequiredCodes: ["HANDOFF_QC_VERIFICATION_PLAN_REVIEW_REQUIRED"]
    }
  ];
}

export function evaluateDiagnosticRelease3HandoffGates(input: DiagnosticRelease3HandoffGateInput): DiagnosticRelease3HandoffGateResult {
  const reasonCodes = unique([
    input.diagnosticCaseId.trim() ? "" : "RELEASE3_HANDOFF_CASE_REQUIRED",
    input.repairOrderId.trim() ? "" : "RELEASE3_HANDOFF_REPAIR_ORDER_REQUIRED",
    validChecksum(input.conclusionChecksum) ? "" : "RELEASE3_HANDOFF_CONCLUSION_CHECKSUM_REQUIRED",
    validChecksum(input.repairHandoffChecksum) ? "" : "RELEASE3_HANDOFF_REPAIR_HANDOFF_CHECKSUM_REQUIRED",
    validChecksum(input.selectedStrategyOutput.outputChecksum) ? "" : "RELEASE3_HANDOFF_STRATEGY_OUTPUT_CHECKSUM_REQUIRED",
    validChecksum(input.selectedStrategyOutput.laborGuideResultChecksum) ? "" : "RELEASE3_HANDOFF_LABOR_GUIDE_CHECKSUM_REQUIRED",
    validChecksum(input.selectedStrategyOutput.economicsResultChecksum) ? "" : "RELEASE3_HANDOFF_ECONOMICS_CHECKSUM_REQUIRED",
    validChecksum(input.selectedStrategyOutput.capacityExplanationResultChecksum) ? "" : "RELEASE3_HANDOFF_CAPACITY_EXPLANATION_CHECKSUM_REQUIRED",
    input.selectedStrategyOutput.draftLines.length ? "" : "RELEASE3_HANDOFF_DRAFT_LINES_REQUIRED",
    input.selectedStrategyOutput.explanationPackages.length ? "" : "RELEASE3_HANDOFF_EXPLANATION_PACKAGE_REQUIRED",
    input.advisorReviewed ? "" : "RELEASE3_HANDOFF_ADVISOR_REVIEW_REQUIRED",
    input.selectedStrategyOutput.requiredApprovalCodes.length && !input.managerReviewed ? "RELEASE3_HANDOFF_MANAGER_REVIEW_REQUIRED" : ""
  ]);
  const warningCodes = unique([
    ...input.selectedStrategyOutput.warningCodes,
    input.selectedStrategyOutput.capacityRisk === "HIGH" ? "RELEASE3_HANDOFF_HIGH_CAPACITY_RISK" : "",
    input.selectedStrategyOutput.partDemandCandidates.some((candidate) => candidate.pricingStatus === "PLACEHOLDER") ? "RELEASE3_HANDOFF_PARTS_PRICING_PENDING" : ""
  ]);
  const blocked = reasonCodes.length > 0;
  const result = {
    version: DIAGNOSTIC_RELEASE_3_HANDOFF_GATES_VERSION,
    occurredAt: input.occurredAt,
    status: blocked ? "BLOCKED" as const : "READY_FOR_HANDOFF_REVIEW" as const,
    reasonCodes,
    warningCodes,
    handoffPackets: packets(input, blocked),
    authorityBoundary
  };
  return { ...result, resultChecksum: hashEnterpriseCommand({ input, result }) };
}

