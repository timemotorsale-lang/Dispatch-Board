import { COOLING_OVERHEATING_NEXT_TEST_READINESS_VERSION } from "./cooling-overheating-next-test-readiness";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const COOLING_OVERHEATING_SHADOW_ACKNOWLEDGEMENT_VERSION = "DGN-061/COOLING-SHADOW-ACKNOWLEDGEMENT/1.0.0";

type CoolingShadowAcknowledgementDecision = "REVIEWED" | "ESCALATION_REQUESTED" | "BLOCKER_ACKNOWLEDGED";

type CoolingShadowReadinessSnapshot = {
  status: "READY" | "BLOCKED" | "ESCALATED" | "NO_FAULT_FOUND";
  shadowOnly: boolean;
  liveExecutionAuthorized: boolean;
  recommendedTestKey: string | null;
  resultChecksum: string;
  reasonCodes: string[];
};

export type CoolingOverheatingShadowAcknowledgementInput = {
  diagnosticCaseId: string;
  readiness: CoolingShadowReadinessSnapshot;
  actorUserId: string;
  decision: CoolingShadowAcknowledgementDecision;
  selectedTestKey?: string | null;
  reason: string;
  acknowledgedAt: string;
};

const canonical = (value: string) => value.trim().toUpperCase();
const validChecksum = (value: string) => /^[0-9a-f]{64}$/.test(value);

export function createCoolingOverheatingShadowAcknowledgement(input: CoolingOverheatingShadowAcknowledgementInput) {
  const actorUserId = input.actorUserId.trim();
  const reason = input.reason.trim();
  const selectedTestKey = input.selectedTestKey ? canonical(input.selectedTestKey) : null;
  const acknowledgedAt = new Date(input.acknowledgedAt);
  if (!input.diagnosticCaseId.trim()) throw new Error("Cooling shadow acknowledgement requires a diagnostic case.");
  if (!actorUserId) throw new Error("Cooling shadow acknowledgement requires a technician.");
  if (reason.length < 10 || reason.length > 500) throw new Error("Cooling shadow acknowledgement reason must be 10 through 500 characters.");
  if (Number.isNaN(acknowledgedAt.getTime())) throw new Error("Cooling shadow acknowledgement requires a valid timestamp.");
  if (!validChecksum(input.readiness.resultChecksum)) throw new Error("Cooling shadow acknowledgement requires the readiness result checksum.");
  if (!input.readiness.shadowOnly || input.readiness.liveExecutionAuthorized) throw new Error("Cooling shadow acknowledgement can only bind to non-executable shadow readiness.");
  if (input.decision === "REVIEWED" && input.readiness.status !== "READY") throw new Error("Only ready shadow recommendations may be acknowledged as reviewed.");
  if (input.decision === "BLOCKER_ACKNOWLEDGED" && input.readiness.status !== "BLOCKED") throw new Error("Only blocked shadow recommendations may acknowledge blockers.");
  if (input.decision === "REVIEWED" && selectedTestKey !== canonical(input.readiness.recommendedTestKey ?? "")) throw new Error("Reviewed acknowledgement must match the recommended shadow test.");
  const lineage = {
    policyVersion: COOLING_OVERHEATING_SHADOW_ACKNOWLEDGEMENT_VERSION,
    readinessPolicyVersion: COOLING_OVERHEATING_NEXT_TEST_READINESS_VERSION,
    diagnosticCaseId: input.diagnosticCaseId,
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
    id: `cool_ack_${hashEnterpriseCommand(lineage).slice(0, 24)}`,
    ...lineage,
    executionAuthorized: false,
    dispatchAuthorized: false,
    repairAuthorized: false,
    customerPresentationAuthorized: false,
    reasonCodes: [
      input.decision === "REVIEWED" ? "COOLING_SHADOW_REVIEW_ACKNOWLEDGED" : input.decision === "BLOCKER_ACKNOWLEDGED" ? "COOLING_SHADOW_BLOCKER_ACKNOWLEDGED" : "COOLING_SHADOW_ESCALATION_REQUESTED",
      "COOLING_SHADOW_ACKNOWLEDGEMENT_NOT_EXECUTION_AUTHORITY"
    ],
    acknowledgementChecksum: hashEnterpriseCommand(lineage)
  };
}
