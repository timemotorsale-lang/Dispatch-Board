import { PHASE_8_ELECTRICAL_NEXT_TEST_READINESS_VERSION } from "./phase-8-electrical-next-test-readiness";
import type { Phase8ElectricalProofFamily } from "./phase-8-electrical-proof";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const PHASE_8_ELECTRICAL_SHADOW_ACKNOWLEDGEMENT_VERSION = "PHASE-8/ELECTRICAL-WAVEFORM-INTERMITTENT-SHADOW-ACKNOWLEDGEMENT/1.0.0";

type Phase8ElectricalShadowAcknowledgementDecision = "REVIEWED" | "ESCALATION_REQUESTED" | "BLOCKER_ACKNOWLEDGED";

type Phase8ElectricalShadowReadinessSnapshot = {
  status: "READY" | "BLOCKED" | "ESCALATED" | "NO_FAULT_FOUND";
  shadowOnly: boolean;
  liveExecutionAuthorized: boolean;
  recommendedTestKey: string | null;
  resultChecksum: string;
  reasonCodes: string[];
};

export type Phase8ElectricalShadowAcknowledgementInput = {
  diagnosticCaseId: string;
  family: Phase8ElectricalProofFamily;
  readiness: Phase8ElectricalShadowReadinessSnapshot;
  actorUserId: string;
  decision: Phase8ElectricalShadowAcknowledgementDecision;
  selectedTestKey?: string | null;
  reason: string;
  acknowledgedAt: string;
};

const canonical = (value: string) => value.trim().toUpperCase();
const validChecksum = (value: string) => /^[0-9a-f]{64}$/.test(value);

function decisionReason(family: Phase8ElectricalProofFamily, decision: Phase8ElectricalShadowAcknowledgementDecision) {
  if (decision === "REVIEWED") return `${family}_SHADOW_REVIEW_ACKNOWLEDGED`;
  if (decision === "BLOCKER_ACKNOWLEDGED") return `${family}_SHADOW_BLOCKER_ACKNOWLEDGED`;
  return `${family}_SHADOW_ESCALATION_REQUESTED`;
}

export function createPhase8ElectricalShadowAcknowledgement(input: Phase8ElectricalShadowAcknowledgementInput) {
  const actorUserId = input.actorUserId.trim();
  const reason = input.reason.trim();
  const selectedTestKey = input.selectedTestKey ? canonical(input.selectedTestKey) : null;
  const acknowledgedAt = new Date(input.acknowledgedAt);
  if (!input.diagnosticCaseId.trim()) throw new Error("Phase 8 shadow acknowledgement requires a diagnostic case.");
  if (!actorUserId) throw new Error("Phase 8 shadow acknowledgement requires a technician.");
  if (reason.length < 10 || reason.length > 500) throw new Error("Phase 8 shadow acknowledgement reason must be 10 through 500 characters.");
  if (Number.isNaN(acknowledgedAt.getTime())) throw new Error("Phase 8 shadow acknowledgement requires a valid timestamp.");
  if (!validChecksum(input.readiness.resultChecksum)) throw new Error("Phase 8 shadow acknowledgement requires the readiness result checksum.");
  if (!input.readiness.shadowOnly || input.readiness.liveExecutionAuthorized) throw new Error("Phase 8 shadow acknowledgement can only bind to non-executable shadow readiness.");
  if (input.decision === "REVIEWED" && input.readiness.status !== "READY") throw new Error("Only ready Phase 8 shadow recommendations may be acknowledged as reviewed.");
  if (input.decision === "BLOCKER_ACKNOWLEDGED" && input.readiness.status !== "BLOCKED") throw new Error("Only blocked Phase 8 shadow recommendations may acknowledge blockers.");
  if (input.decision === "ESCALATION_REQUESTED" && input.readiness.status !== "ESCALATED") throw new Error("Only escalated Phase 8 shadow recommendations may request escalation acknowledgement.");
  if (input.decision === "REVIEWED" && selectedTestKey !== canonical(input.readiness.recommendedTestKey ?? "")) throw new Error("Reviewed Phase 8 acknowledgement must match the recommended shadow test.");
  const lineage = {
    policyVersion: PHASE_8_ELECTRICAL_SHADOW_ACKNOWLEDGEMENT_VERSION,
    readinessPolicyVersion: PHASE_8_ELECTRICAL_NEXT_TEST_READINESS_VERSION,
    diagnosticCaseId: input.diagnosticCaseId,
    family: input.family,
    readinessResultChecksum: input.readiness.resultChecksum,
    readinessStatus: input.readiness.status,
    recommendedTestKey: input.readiness.recommendedTestKey,
    selectedTestKey,
    decision: input.decision,
    actorUserId,
    acknowledgedAt: acknowledgedAt.toISOString(),
    reason
  };
  return {
    id: `p8_ack_${hashEnterpriseCommand(lineage).slice(0, 24)}`,
    ...lineage,
    executionAuthorized: false,
    unsafeProbingAuthorized: false,
    roadTestAuthorized: false,
    dispatchAuthorized: false,
    repairAuthorized: false,
    customerPresentationAuthorized: false,
    pilotAuthorized: false,
    productionAuthorized: false,
    reasonCodes: [
      decisionReason(input.family, input.decision),
      "PHASE_8_SHADOW_ACKNOWLEDGEMENT_NOT_EXECUTION_AUTHORITY"
    ],
    acknowledgementChecksum: hashEnterpriseCommand(lineage)
  };
}
