import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import type { DiagnosticExplanationPackage } from "./capacity-explanation-domain";
import type { DiagnosticRelease4OperationalReadinessResult } from "./release-4-operational-readiness-domain";

export const DIAGNOSTIC_RELEASE_4_REVIEW_APPROVAL_VERSION = "DGN-052-053/REVIEW-APPROVAL-CONTROLS/1.0.0";

export type DiagnosticManagerApprovalTrigger = "DISCOUNT" | "MARGIN_RISK" | "NONSTANDARD_LABOR_TIME" | "STRATEGY_DEVIATION" | "SOURCE_GAP" | "HIGH_RISK_CASE";

export type DiagnosticManagerApprovalRecord = {
  approvalId: string;
  trigger: DiagnosticManagerApprovalTrigger;
  decision: "APPROVED" | "REJECTED" | "HELD";
  decidedBy: string;
  decidedAt: string;
  reason: string;
  supersedesApprovalId?: string;
};

export type DiagnosticRelease4ReviewApprovalInput = {
  occurredAt: string;
  operationalReadiness: Pick<DiagnosticRelease4OperationalReadinessResult, "status" | "resultChecksum">;
  explanationPackages: DiagnosticExplanationPackage[];
  requiredApprovalTriggers: DiagnosticManagerApprovalTrigger[];
  approvalLineage: DiagnosticManagerApprovalRecord[];
  advisorReviewed: boolean;
  editRequiredFlagsResolved: boolean;
};

export type DiagnosticRelease4ReviewApprovalResult = {
  version: string;
  occurredAt: string;
  status: "READY_FOR_PILOT_REPLAY" | "BLOCKED";
  draftWorkflow: {
    customerDraftCount: number;
    insuranceDraftCount: number;
    editRequired: boolean;
    status: "READY_FOR_INTERNAL_REVIEW" | "BLOCKED";
  };
  requiredApprovalTriggers: DiagnosticManagerApprovalTrigger[];
  effectiveApprovals: DiagnosticManagerApprovalRecord[];
  reasonCodes: string[];
  warningCodes: string[];
  authorityBoundary: {
    internalReviewOnly: true;
    customerSendProhibited: true;
    authorizationRequestProhibited: true;
    insurerSubmissionProhibited: true;
    downstreamExecutionProhibited: true;
    approvalLineageAppendOnly: true;
  };
  resultChecksum: string;
};

const authorityBoundary = {
  internalReviewOnly: true,
  customerSendProhibited: true,
  authorizationRequestProhibited: true,
  insurerSubmissionProhibited: true,
  downstreamExecutionProhibited: true,
  approvalLineageAppendOnly: true
} as const;

const unique = <T extends string>(values: T[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const validChecksum = (value: string) => /^[0-9a-f]{64}$/.test(value);

function validateApprovalLineage(records: DiagnosticManagerApprovalRecord[]) {
  const ids = new Set<string>();
  const reasons: string[] = [];
  for (const record of records) {
    if (!record.approvalId.trim() || ids.has(record.approvalId)) reasons.push("DGN053_APPROVAL_ID_UNIQUE_REQUIRED");
    if (!record.decidedBy.trim()) reasons.push("DGN053_APPROVER_REQUIRED");
    if (record.reason.trim().length < 10) reasons.push("DGN053_APPROVAL_REASON_REQUIRED");
    if (record.supersedesApprovalId && !ids.has(record.supersedesApprovalId)) reasons.push("DGN053_APPROVAL_SUPERSESSION_ORDER_INVALID");
    ids.add(record.approvalId);
  }
  return unique(reasons);
}

function effectiveApprovals(records: DiagnosticManagerApprovalRecord[]) {
  const superseded = new Set(records.map((record) => record.supersedesApprovalId).filter((value): value is string => Boolean(value)));
  return records.filter((record) => !superseded.has(record.approvalId));
}

export function evaluateDiagnosticRelease4ReviewApproval(input: DiagnosticRelease4ReviewApprovalInput): DiagnosticRelease4ReviewApprovalResult {
  const customerDraftCount = input.explanationPackages.filter((item) => item.audience === "CUSTOMER").length;
  const insuranceDraftCount = input.explanationPackages.filter((item) => item.audience === "INSURANCE").length;
  const packagesKeepBoundary = input.explanationPackages.every((item) => item.authorityBoundary.draftOnly
    && item.authorityBoundary.customerPresentationProhibited
    && item.authorityBoundary.insurerSubmissionProhibited
    && item.authorityBoundary.authorizationRequestProhibited);
  const activeApprovals = effectiveApprovals(input.approvalLineage);
  const approvedTriggers = new Set(activeApprovals.filter((record) => record.decision === "APPROVED").map((record) => record.trigger));
  const requiredTriggers = unique(input.requiredApprovalTriggers);
  const missingApprovals = requiredTriggers.filter((trigger) => !approvedTriggers.has(trigger));
  const lineageReasons = validateApprovalLineage(input.approvalLineage);
  const reasonCodes = unique([
    input.operationalReadiness.status === "READY_FOR_REVIEW_CONTROLS" ? "" : "DGN052_OPERATIONAL_READINESS_REQUIRED",
    validChecksum(input.operationalReadiness.resultChecksum) ? "" : "DGN052_OPERATIONAL_READINESS_CHECKSUM_REQUIRED",
    input.explanationPackages.length ? "" : "DGN052_EXPLANATION_PACKAGE_REQUIRED",
    customerDraftCount ? "" : "DGN052_CUSTOMER_DRAFT_REQUIRED",
    packagesKeepBoundary ? "" : "DGN052_DRAFT_AUTHORITY_BOUNDARY_REQUIRED",
    input.advisorReviewed ? "" : "DGN052_ADVISOR_REVIEW_REQUIRED",
    input.editRequiredFlagsResolved ? "" : "DGN052_EDIT_REQUIRED_FLAGS_UNRESOLVED",
    ...missingApprovals.map((trigger) => `DGN053_${trigger}_APPROVAL_REQUIRED`),
    ...lineageReasons
  ]);
  const result = {
    version: DIAGNOSTIC_RELEASE_4_REVIEW_APPROVAL_VERSION,
    occurredAt: input.occurredAt,
    status: reasonCodes.length ? "BLOCKED" as const : "READY_FOR_PILOT_REPLAY" as const,
    draftWorkflow: {
      customerDraftCount,
      insuranceDraftCount,
      editRequired: input.explanationPackages.some((item) => item.editRequired) && !input.editRequiredFlagsResolved,
      status: customerDraftCount && packagesKeepBoundary && input.advisorReviewed && input.editRequiredFlagsResolved ? "READY_FOR_INTERNAL_REVIEW" as const : "BLOCKED" as const
    },
    requiredApprovalTriggers: requiredTriggers,
    effectiveApprovals: activeApprovals,
    reasonCodes,
    warningCodes: unique([
      "DGN052_INTERNAL_DRAFTS_CANNOT_BE_SENT",
      insuranceDraftCount ? "DGN052_INSURANCE_SUBMISSION_BLOCKED" : "",
      requiredTriggers.length ? "DGN053_APPROVAL_DOES_NOT_AUTHORIZE_EXECUTION" : ""
    ]),
    authorityBoundary
  };
  return { ...result, resultChecksum: hashEnterpriseCommand({ input, result }) };
}
