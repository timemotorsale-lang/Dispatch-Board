import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_RELEASE_4_OPERATIONAL_READINESS_VERSION = "DGN-049-051/OPERATIONAL-READINESS/1.0.0";

export type DiagnosticLaborSourceReadiness = {
  sourceId: string;
  sourceType: "INTERNAL_SEED" | "LICENSED" | "PLACEHOLDER";
  sourceApproved: boolean;
  shopLaborPolicyVersion: string;
  skillAndRateRulesComplete: boolean;
  advisorReviewed: boolean;
  managerReviewed: boolean;
};

export type DiagnosticPartsPricingReadiness = {
  demandCandidateCount: number;
  placeholderPriceCount: number;
  fitmentReviewComplete: boolean;
  sourceConfidenceDocumented: boolean;
  partsPersonReviewed: boolean;
};

export type DiagnosticDispatchCapacityReadiness = {
  capacityPacketCount: number;
  skillConstraintsReviewed: boolean;
  bayConstraintsReviewed: boolean;
  toolConstraintsReviewed: boolean;
  dispatchReviewed: boolean;
};

export type DiagnosticRelease4OperationalReadinessInput = {
  occurredAt: string;
  release3AcceptanceChecksum: string;
  release3AcceptedForRelease4: boolean;
  labor: DiagnosticLaborSourceReadiness;
  parts: DiagnosticPartsPricingReadiness;
  dispatch: DiagnosticDispatchCapacityReadiness;
};

export type DiagnosticOperationalReadinessPacket = {
  milestoneId: "DGN-049" | "DGN-050" | "DGN-051";
  status: "READY_FOR_INTERNAL_REVIEW" | "BLOCKED";
  reasonCodes: string[];
  warningCodes: string[];
  authorityLabel: string;
};

export type DiagnosticRelease4OperationalReadinessResult = {
  version: string;
  occurredAt: string;
  status: "READY_FOR_REVIEW_CONTROLS" | "BLOCKED";
  packets: DiagnosticOperationalReadinessPacket[];
  reasonCodes: string[];
  warningCodes: string[];
  authorityBoundary: {
    advisoryOnly: true;
    finalLaborTimeAuthorityProhibited: true;
    partsMutationProhibited: true;
    automaticOrderingProhibited: true;
    dispatchMutationProhibited: true;
    schedulingMutationProhibited: true;
  };
  resultChecksum: string;
};

const authorityBoundary = {
  advisoryOnly: true,
  finalLaborTimeAuthorityProhibited: true,
  partsMutationProhibited: true,
  automaticOrderingProhibited: true,
  dispatchMutationProhibited: true,
  schedulingMutationProhibited: true
} as const;

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const validChecksum = (value: string) => /^[0-9a-f]{64}$/.test(value);

function laborPacket(input: DiagnosticLaborSourceReadiness): DiagnosticOperationalReadinessPacket {
  const reasonCodes = unique([
    input.sourceId.trim() ? "" : "DGN049_LABOR_SOURCE_REQUIRED",
    input.shopLaborPolicyVersion.trim() ? "" : "DGN049_SHOP_LABOR_POLICY_REQUIRED",
    input.skillAndRateRulesComplete ? "" : "DGN049_SKILL_RATE_RULES_INCOMPLETE",
    input.advisorReviewed ? "" : "DGN049_ADVISOR_REVIEW_REQUIRED",
    input.managerReviewed ? "" : "DGN049_MANAGER_REVIEW_REQUIRED"
  ]);
  const warningCodes = unique([
    input.sourceApproved ? "" : "DGN049_LABOR_SOURCE_NOT_APPROVED",
    input.sourceType === "PLACEHOLDER" ? "DGN049_PLACEHOLDER_LABOR_SOURCE" : "",
    input.sourceType === "INTERNAL_SEED" ? "DGN049_INTERNAL_SEED_TIME_NOT_FINAL_AUTHORITY" : ""
  ]);
  return {
    milestoneId: "DGN-049",
    status: reasonCodes.length ? "BLOCKED" : "READY_FOR_INTERNAL_REVIEW",
    reasonCodes,
    warningCodes,
    authorityLabel: input.sourceApproved && input.sourceType === "LICENSED"
      ? "Approved source; advisor and manager review still required before downstream consideration."
      : "Draft labor intelligence only; no final labor-time authority."
  };
}

function partsPacket(input: DiagnosticPartsPricingReadiness): DiagnosticOperationalReadinessPacket {
  const reasonCodes = unique([
    Number.isInteger(input.demandCandidateCount) && input.demandCandidateCount >= 0 ? "" : "DGN050_DEMAND_COUNT_INVALID",
    Number.isInteger(input.placeholderPriceCount) && input.placeholderPriceCount >= 0 && input.placeholderPriceCount <= input.demandCandidateCount ? "" : "DGN050_PLACEHOLDER_COUNT_INVALID",
    input.fitmentReviewComplete ? "" : "DGN050_FITMENT_REVIEW_REQUIRED",
    input.sourceConfidenceDocumented ? "" : "DGN050_SOURCE_CONFIDENCE_REQUIRED",
    input.partsPersonReviewed ? "" : "DGN050_PARTS_PERSON_REVIEW_REQUIRED"
  ]);
  return {
    milestoneId: "DGN-050",
    status: reasonCodes.length ? "BLOCKED" : "READY_FOR_INTERNAL_REVIEW",
    reasonCodes,
    warningCodes: unique([
      input.placeholderPriceCount ? "DGN050_PLACEHOLDER_PRICING_REMAINS" : "",
      input.demandCandidateCount ? "DGN050_DEMAND_SIGNALS_ONLY" : "DGN050_NO_PART_DEMAND_CANDIDATES"
    ]),
    authorityLabel: "Demand signals only; reserve, order, substitute, receive, and inventory mutations are prohibited."
  };
}

function dispatchPacket(input: DiagnosticDispatchCapacityReadiness): DiagnosticOperationalReadinessPacket {
  const reasonCodes = unique([
    Number.isInteger(input.capacityPacketCount) && input.capacityPacketCount > 0 ? "" : "DGN051_CAPACITY_PACKET_REQUIRED",
    input.skillConstraintsReviewed ? "" : "DGN051_SKILL_CONSTRAINT_REVIEW_REQUIRED",
    input.bayConstraintsReviewed ? "" : "DGN051_BAY_CONSTRAINT_REVIEW_REQUIRED",
    input.toolConstraintsReviewed ? "" : "DGN051_TOOL_CONSTRAINT_REVIEW_REQUIRED",
    input.dispatchReviewed ? "" : "DGN051_DISPATCH_REVIEW_REQUIRED"
  ]);
  return {
    milestoneId: "DGN-051",
    status: reasonCodes.length ? "BLOCKED" : "READY_FOR_INTERNAL_REVIEW",
    reasonCodes,
    warningCodes: ["DGN051_CAPACITY_IS_READ_ONLY"],
    authorityLabel: "Read-only impact packet; task, appointment, technician, bay, and schedule mutations are prohibited."
  };
}

export function evaluateDiagnosticRelease4OperationalReadiness(input: DiagnosticRelease4OperationalReadinessInput): DiagnosticRelease4OperationalReadinessResult {
  const packets = [laborPacket(input.labor), partsPacket(input.parts), dispatchPacket(input.dispatch)];
  const foundationReasons = unique([
    input.release3AcceptedForRelease4 ? "" : "DGN049_RELEASE3_ACCEPTANCE_REQUIRED",
    validChecksum(input.release3AcceptanceChecksum) ? "" : "DGN049_RELEASE3_ACCEPTANCE_CHECKSUM_REQUIRED"
  ]);
  const reasonCodes = unique([...foundationReasons, ...packets.flatMap((packet) => packet.reasonCodes)]);
  const warningCodes = unique(packets.flatMap((packet) => packet.warningCodes));
  const result = {
    version: DIAGNOSTIC_RELEASE_4_OPERATIONAL_READINESS_VERSION,
    occurredAt: input.occurredAt,
    status: reasonCodes.length ? "BLOCKED" as const : "READY_FOR_REVIEW_CONTROLS" as const,
    packets,
    reasonCodes,
    warningCodes,
    authorityBoundary
  };
  return { ...result, resultChecksum: hashEnterpriseCommand({ input, result }) };
}
