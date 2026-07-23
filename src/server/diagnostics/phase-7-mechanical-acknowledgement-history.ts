import type { createPhase7MechanicalShadowAcknowledgement } from "./phase-7-mechanical-shadow-acknowledgement";
import { PHASE_7_MECHANICAL_SHADOW_ACKNOWLEDGEMENT_VERSION } from "./phase-7-mechanical-shadow-acknowledgement";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const PHASE_7_MECHANICAL_ACKNOWLEDGEMENT_HISTORY_VERSION = "PHASE-7/BRAKE-HVAC-MISFIRE-ACKNOWLEDGEMENT-HISTORY/1.0.0";

export type Phase7MechanicalShadowAcknowledgementRecord = ReturnType<typeof createPhase7MechanicalShadowAcknowledgement>;

const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical))].sort((left, right) => left.localeCompare(right));
const checksumOk = (value: string) => /^[0-9a-f]{64}$/.test(value);

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function objectFrom(map: Map<string, number>) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

export function buildPhase7MechanicalAcknowledgementHistory(records: readonly Phase7MechanicalShadowAcknowledgementRecord[]) {
  const ids = new Set<string>();
  const checksums = new Set<string>();
  const validationErrors: string[] = [];
  const byFamily = new Map<string, number>();
  const byDecision = new Map<string, number>();
  const byReadinessStatus = new Map<string, number>();
  const byRecommendedTest = new Map<string, number>();
  const byActor = new Map<string, number>();
  const byCase = new Map<string, Phase7MechanicalShadowAcknowledgementRecord[]>();
  const sorted = [...records].sort((left, right) => left.acknowledgedAt.localeCompare(right.acknowledgedAt) || left.id.localeCompare(right.id));

  for (const record of sorted) {
    if (record.policyVersion !== PHASE_7_MECHANICAL_SHADOW_ACKNOWLEDGEMENT_VERSION) validationErrors.push(`ACK_POLICY_MISMATCH:${record.id}`);
    if (ids.has(record.id)) validationErrors.push(`ACK_DUPLICATE_ID:${record.id}`);
    ids.add(record.id);
    if (!checksumOk(record.acknowledgementChecksum)) validationErrors.push(`ACK_CHECKSUM_INVALID:${record.id}`);
    if (checksums.has(record.acknowledgementChecksum)) validationErrors.push(`ACK_DUPLICATE_CHECKSUM:${record.id}`);
    checksums.add(record.acknowledgementChecksum);
    if (!checksumOk(record.readinessResultChecksum)) validationErrors.push(`READINESS_CHECKSUM_INVALID:${record.id}`);
    if (record.executionAuthorized || record.dispatchAuthorized || record.repairAuthorized || record.customerPresentationAuthorized || record.pilotAuthorized || record.productionAuthorized) validationErrors.push(`ACK_AUTHORITY_VIOLATION:${record.id}`);
    if (record.decision === "REVIEWED" && record.selectedTestKey !== record.recommendedTestKey) validationErrors.push(`ACK_SELECTED_TEST_DRIFT:${record.id}`);
    increment(byFamily, record.family);
    increment(byDecision, record.decision);
    increment(byReadinessStatus, record.readinessStatus);
    increment(byRecommendedTest, record.recommendedTestKey ?? "NONE");
    increment(byActor, record.actorUserId);
    byCase.set(record.diagnosticCaseId, [...(byCase.get(record.diagnosticCaseId) ?? []), record]);
  }

  const latestByCase = [...byCase.entries()]
    .map(([diagnosticCaseId, caseRecords]) => {
      const latest = [...caseRecords].sort((left, right) => right.acknowledgedAt.localeCompare(left.acknowledgedAt) || right.id.localeCompare(left.id))[0];
      return { diagnosticCaseId, acknowledgementId: latest.id, family: latest.family, decision: latest.decision, readinessStatus: latest.readinessStatus, recommendedTestKey: latest.recommendedTestKey, acknowledgedAt: latest.acknowledgedAt, actorUserId: latest.actorUserId, acknowledgementChecksum: latest.acknowledgementChecksum };
    })
    .sort((left, right) => left.diagnosticCaseId.localeCompare(right.diagnosticCaseId));
  const escalationCases = unique(sorted.filter((record) => record.decision === "ESCALATION_REQUESTED" || record.readinessStatus === "ESCALATED").map((record) => record.diagnosticCaseId));
  const blockedCases = unique(sorted.filter((record) => record.decision === "BLOCKER_ACKNOWLEDGED" || record.readinessStatus === "BLOCKED").map((record) => record.diagnosticCaseId));
  const reviewedFamilies = unique(sorted.filter((record) => record.decision === "REVIEWED").map((record) => record.family));
  const deterministicInput = { historyVersion: PHASE_7_MECHANICAL_ACKNOWLEDGEMENT_HISTORY_VERSION, records: sorted.map((record) => ({ id: record.id, acknowledgementChecksum: record.acknowledgementChecksum })) };
  const summary = {
    recordCount: sorted.length,
    caseCount: byCase.size,
    byFamily: objectFrom(byFamily),
    byDecision: objectFrom(byDecision),
    byReadinessStatus: objectFrom(byReadinessStatus),
    byRecommendedTest: objectFrom(byRecommendedTest),
    byActor: objectFrom(byActor),
    latestByCase,
    escalationCases,
    blockedCases,
    reviewedFamilies,
    validationErrors: unique(validationErrors),
    replaySafe: validationErrors.length === 0,
    executionAuthorizedCount: sorted.filter((record) => record.executionAuthorized || record.dispatchAuthorized || record.repairAuthorized || record.customerPresentationAuthorized || record.pilotAuthorized || record.productionAuthorized).length
  };
  return {
    historyVersion: PHASE_7_MECHANICAL_ACKNOWLEDGEMENT_HISTORY_VERSION,
    acknowledgementPolicyVersion: PHASE_7_MECHANICAL_SHADOW_ACKNOWLEDGEMENT_VERSION,
    replayOnly: true,
    managerReviewReady: summary.replaySafe,
    pilotEvidenceOnly: true,
    liveExecutionAuthorized: false,
    ...summary,
    inputChecksum: hashEnterpriseCommand(deterministicInput),
    historyChecksum: hashEnterpriseCommand(summary)
  };
}
