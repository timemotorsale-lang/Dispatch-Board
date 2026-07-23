import { buildCoolingOverheatingAcknowledgementHistory, type CoolingOverheatingShadowAcknowledgementRecord } from "./cooling-overheating-acknowledgement-history";
import { COOLING_OVERHEATING_SHADOW_ACKNOWLEDGEMENT_VERSION } from "./cooling-overheating-shadow-acknowledgement";
import { COOLING_OVERHEATING_NEXT_TEST_READINESS_VERSION } from "./cooling-overheating-next-test-readiness";
import { COOLING_OVERHEATING_PROOF_CORPUS_VERSION, runCoolingOverheatingProofCorpus } from "./cooling-overheating-proof";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const COOLING_OVERHEATING_MANAGER_REVIEW_CARD_VERSION = "DGN-063/COOLING-MANAGER-REVIEW-CARD/1.0.0";
export const COOLING_OVERHEATING_ACKNOWLEDGEMENT_PERSISTENCE_BOUNDARY_VERSION = "DGN-064/COOLING-ACK-PERSISTENCE-BOUNDARY/1.0.0";
export const COOLING_OVERHEATING_PILOT_EVIDENCE_PACKAGE_VERSION = "DGN-065/COOLING-PILOT-EVIDENCE-PACKAGE/1.0.0";

type CoolingPilotEvidenceStatus = "READY_FOR_MANAGER_REVIEW" | "BLOCKED" | "ESCALATION_REVIEW";

const checksumOk = (value: string) => /^[0-9a-f]{64}$/.test(value);
const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.filter(Boolean).map(canonical))].sort((left, right) => left.localeCompare(right));

const authorityBoundary = {
  reviewOnly: true,
  liveExecutionAuthorized: false,
  dispatchAuthorized: false,
  repairAuthorized: false,
  customerPresentationAuthorized: false,
  controlledPilotAuthorized: false,
  productionAuthorized: false
} as const;

export function buildCoolingOverheatingManagerReviewCard(history: ReturnType<typeof buildCoolingOverheatingAcknowledgementHistory>) {
  const status: CoolingPilotEvidenceStatus = !history.replaySafe || history.recordCount === 0
    ? "BLOCKED"
    : history.escalationCases.length
      ? "ESCALATION_REVIEW"
      : "READY_FOR_MANAGER_REVIEW";
  const holdCodes = unique([
    history.recordCount ? "" : "DGN063_NO_ACKNOWLEDGEMENT_HISTORY",
    history.replaySafe ? "" : "DGN063_ACKNOWLEDGEMENT_HISTORY_NOT_REPLAY_SAFE",
    history.executionAuthorizedCount === 0 ? "" : "DGN063_AUTHORITY_VIOLATION_REVIEW_REQUIRED"
  ]);
  const reviewItems = [
    { key: "ACK_HISTORY", label: "Acknowledgement history", status: history.replaySafe && history.recordCount ? "READY" : "BLOCKED", detail: `${history.recordCount} acknowledgement records across ${history.caseCount} cases.` },
    { key: "BLOCKERS", label: "Blocked recommendations", status: history.blockedCases.length ? "HOLD" : "READY", detail: `${history.blockedCases.length} cooling cases have blocker acknowledgement.` },
    { key: "ESCALATIONS", label: "Escalation posture", status: history.escalationCases.length ? "HOLD" : "READY", detail: `${history.escalationCases.length} cooling cases require escalation review.` },
    { key: "AUTHORITY", label: "Authority boundary", status: history.executionAuthorizedCount ? "BLOCKED" : "READY", detail: "Acknowledgement records must remain review-only." }
  ] as const;
  const result = {
    version: COOLING_OVERHEATING_MANAGER_REVIEW_CARD_VERSION,
    status,
    holdCodes,
    reviewItems,
    metrics: {
      acknowledgementCount: history.recordCount,
      caseCount: history.caseCount,
      blockedCaseCount: history.blockedCases.length,
      escalationCaseCount: history.escalationCases.length,
      executionAuthorizedCount: history.executionAuthorizedCount
    },
    latestByCase: history.latestByCase,
    authorityBoundary
  };
  return { ...result, cardChecksum: hashEnterpriseCommand(result) };
}

export function normalizeCoolingOverheatingAcknowledgementPersistenceCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Cooling acknowledgement persistence command must be an object.");
  const raw = value as Record<string, unknown>;
  const expectedCaseVersion = Number(raw.expectedCaseVersion);
  const idempotencyKey = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : "";
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  const acknowledgement = raw.acknowledgement as CoolingOverheatingShadowAcknowledgementRecord | undefined;
  if (!Number.isInteger(expectedCaseVersion) || expectedCaseVersion < 1) throw new Error("Cooling acknowledgement persistence requires a positive case version.");
  if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("Cooling acknowledgement persistence requires an idempotency key.");
  if (reason.length < 10 || reason.length > 500) throw new Error("Cooling acknowledgement persistence reason must be 10 through 500 characters.");
  if (!acknowledgement || typeof acknowledgement !== "object") throw new Error("Cooling acknowledgement persistence requires an acknowledgement record.");
  if (acknowledgement.policyVersion !== COOLING_OVERHEATING_SHADOW_ACKNOWLEDGEMENT_VERSION) throw new Error("Cooling acknowledgement persistence requires the DGN-061 acknowledgement policy.");
  if (!checksumOk(acknowledgement.acknowledgementChecksum) || !checksumOk(acknowledgement.readinessResultChecksum)) throw new Error("Cooling acknowledgement persistence requires acknowledgement and readiness checksums.");
  if (acknowledgement.executionAuthorized || acknowledgement.dispatchAuthorized || acknowledgement.repairAuthorized || acknowledgement.customerPresentationAuthorized) throw new Error("Cooling acknowledgement persistence cannot record execution authority.");
  const normalized = {
    policyVersion: COOLING_OVERHEATING_ACKNOWLEDGEMENT_PERSISTENCE_BOUNDARY_VERSION,
    expectedCaseVersion,
    idempotencyKey,
    reason,
    appendOnly: true,
    subjectType: "DIAGNOSTIC_COOLING_SHADOW_ACKNOWLEDGEMENT",
    diagnosticCaseId: acknowledgement.diagnosticCaseId,
    acknowledgementId: acknowledgement.id,
    acknowledgementChecksum: acknowledgement.acknowledgementChecksum,
    readinessResultChecksum: acknowledgement.readinessResultChecksum,
    acknowledgement
  };
  return { ...normalized, commandChecksum: hashEnterpriseCommand(normalized), authorityBoundary };
}

export function buildCoolingOverheatingPilotEvidencePackage(input: {
  occurredAt: string;
  builtBy: string;
  acknowledgements: readonly CoolingOverheatingShadowAcknowledgementRecord[];
  representativeCaseMinimum?: number;
}) {
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Cooling pilot evidence package requires a valid timestamp.");
  if (!input.builtBy.trim()) throw new Error("Cooling pilot evidence package requires a builder.");
  const history = buildCoolingOverheatingAcknowledgementHistory(input.acknowledgements);
  const managerReview = buildCoolingOverheatingManagerReviewCard(history);
  const proof = runCoolingOverheatingProofCorpus();
  const representativeCaseMinimum = input.representativeCaseMinimum ?? 2;
  if (!Number.isInteger(representativeCaseMinimum) || representativeCaseMinimum < 1) throw new Error("Representative case minimum must be a positive integer.");
  const evidenceRecords = [
    { key: "PROOF_CORPUS", status: proof.passed ? "ACCEPTED" : "REJECTED", checksum: proof.runChecksum, note: `${proof.scenarioCount} cooling proof scenarios across ${proof.familyCoverage.length} families.` },
    { key: "ACKNOWLEDGEMENT_HISTORY", status: history.replaySafe && history.recordCount >= representativeCaseMinimum ? "ACCEPTED" : "MISSING", checksum: history.historyChecksum, note: `${history.recordCount} acknowledgement records; minimum ${representativeCaseMinimum}.` },
    { key: "MANAGER_REVIEW_CARD", status: managerReview.status === "READY_FOR_MANAGER_REVIEW" ? "ACCEPTED" : "MISSING", checksum: managerReview.cardChecksum, note: managerReview.status },
    { key: "PERSISTENCE_BOUNDARY", status: "ACCEPTED", checksum: hashEnterpriseCommand(COOLING_OVERHEATING_ACKNOWLEDGEMENT_PERSISTENCE_BOUNDARY_VERSION), note: "Append-only command boundary is defined; durable database persistence is still gated." }
  ] as const;
  const holdCodes = unique([
    proof.passed ? "" : "DGN065_PROOF_CORPUS_NOT_ACCEPTED",
    history.replaySafe ? "" : "DGN065_ACK_HISTORY_NOT_REPLAY_SAFE",
    history.recordCount >= representativeCaseMinimum ? "" : "DGN065_REPRESENTATIVE_ACK_HISTORY_REQUIRED",
    managerReview.status === "READY_FOR_MANAGER_REVIEW" ? "" : "DGN065_MANAGER_REVIEW_NOT_READY"
  ]);
  const result = {
    version: COOLING_OVERHEATING_PILOT_EVIDENCE_PACKAGE_VERSION,
    occurredAt: occurredAt.toISOString(),
    builtBy: input.builtBy.trim(),
    status: holdCodes.length ? "BLOCKED" as const : "READY_FOR_PILOT_EVIDENCE_REVIEW" as const,
    holdCodes,
    evidenceRecords,
    sourceVersions: [COOLING_OVERHEATING_PROOF_CORPUS_VERSION, COOLING_OVERHEATING_NEXT_TEST_READINESS_VERSION, COOLING_OVERHEATING_SHADOW_ACKNOWLEDGEMENT_VERSION],
    history,
    managerReview,
    proofSummary: { corpusVersion: proof.corpusVersion, scenarioCount: proof.scenarioCount, familyCoverage: proof.familyCoverage, passed: proof.passed, runChecksum: proof.runChecksum },
    authorityBoundary
  };
  return { ...result, packageChecksum: hashEnterpriseCommand(result) };
}
