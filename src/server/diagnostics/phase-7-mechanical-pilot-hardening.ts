import { buildPhase7MechanicalAcknowledgementHistory, type Phase7MechanicalShadowAcknowledgementRecord } from "./phase-7-mechanical-acknowledgement-history";
import { PHASE_7_MECHANICAL_ACKNOWLEDGEMENT_HISTORY_VERSION } from "./phase-7-mechanical-acknowledgement-history";
import { PHASE_7_MECHANICAL_NEXT_TEST_READINESS_VERSION } from "./phase-7-mechanical-next-test-readiness";
import { PHASE_7_MECHANICAL_PROOF_CORPUS_VERSION, runPhase7MechanicalProofCorpus } from "./phase-7-mechanical-proof";
import { PHASE_7_MECHANICAL_SHADOW_ACKNOWLEDGEMENT_VERSION } from "./phase-7-mechanical-shadow-acknowledgement";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const PHASE_7_MECHANICAL_MANAGER_REVIEW_CARD_VERSION = "PHASE-7/BRAKE-HVAC-MISFIRE-MANAGER-REVIEW-CARD/1.0.0";
export const PHASE_7_MECHANICAL_ACKNOWLEDGEMENT_PERSISTENCE_BOUNDARY_VERSION = "PHASE-7/BRAKE-HVAC-MISFIRE-ACK-PERSISTENCE-BOUNDARY/1.0.0";
export const PHASE_7_MECHANICAL_PILOT_EVIDENCE_PACKAGE_VERSION = "PHASE-7/BRAKE-HVAC-MISFIRE-PILOT-EVIDENCE-PACKAGE/1.0.0";

type Phase7PilotEvidenceStatus = "READY_FOR_MANAGER_REVIEW" | "BLOCKED" | "ESCALATION_REVIEW";

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
  productionAuthorized: false,
  aiActivationAuthorized: false
} as const;

export function buildPhase7MechanicalManagerReviewCard(history: ReturnType<typeof buildPhase7MechanicalAcknowledgementHistory>) {
  const status: Phase7PilotEvidenceStatus = !history.replaySafe || history.recordCount === 0
    ? "BLOCKED"
    : history.escalationCases.length
      ? "ESCALATION_REVIEW"
      : "READY_FOR_MANAGER_REVIEW";
  const holdCodes = unique([
    history.recordCount ? "" : "P7M063_NO_ACKNOWLEDGEMENT_HISTORY",
    history.replaySafe ? "" : "P7M063_ACKNOWLEDGEMENT_HISTORY_NOT_REPLAY_SAFE",
    history.executionAuthorizedCount === 0 ? "" : "P7M063_AUTHORITY_VIOLATION_REVIEW_REQUIRED"
  ]);
  const reviewItems = [
    { key: "ACK_HISTORY", label: "Acknowledgement history", status: history.replaySafe && history.recordCount ? "READY" : "BLOCKED", detail: `${history.recordCount} acknowledgement records across ${history.caseCount} cases.` },
    { key: "FAMILY_COVERAGE", label: "Family coverage", status: history.reviewedFamilies.length >= 2 ? "READY" : "HOLD", detail: `${history.reviewedFamilies.length} Phase 7 families have reviewed acknowledgement evidence.` },
    { key: "BLOCKERS", label: "Blocked recommendations", status: history.blockedCases.length ? "HOLD" : "READY", detail: `${history.blockedCases.length} Phase 7 cases have blocker acknowledgement.` },
    { key: "ESCALATIONS", label: "Escalation posture", status: history.escalationCases.length ? "HOLD" : "READY", detail: `${history.escalationCases.length} Phase 7 cases require escalation review.` },
    { key: "AUTHORITY", label: "Authority boundary", status: history.executionAuthorizedCount ? "BLOCKED" : "READY", detail: "Acknowledgement records must remain review-only." }
  ] as const;
  const result = {
    version: PHASE_7_MECHANICAL_MANAGER_REVIEW_CARD_VERSION,
    status,
    holdCodes,
    reviewItems,
    metrics: {
      acknowledgementCount: history.recordCount,
      caseCount: history.caseCount,
      reviewedFamilyCount: history.reviewedFamilies.length,
      blockedCaseCount: history.blockedCases.length,
      escalationCaseCount: history.escalationCases.length,
      executionAuthorizedCount: history.executionAuthorizedCount
    },
    byFamily: history.byFamily,
    latestByCase: history.latestByCase,
    authorityBoundary
  };
  return { ...result, cardChecksum: hashEnterpriseCommand(result) };
}

export function normalizePhase7MechanicalAcknowledgementPersistenceCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Phase 7 acknowledgement persistence command must be an object.");
  const raw = value as Record<string, unknown>;
  const expectedCaseVersion = Number(raw.expectedCaseVersion);
  const idempotencyKey = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : "";
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  const acknowledgement = raw.acknowledgement as Phase7MechanicalShadowAcknowledgementRecord | undefined;
  if (!Number.isInteger(expectedCaseVersion) || expectedCaseVersion < 1) throw new Error("Phase 7 acknowledgement persistence requires a positive case version.");
  if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("Phase 7 acknowledgement persistence requires an idempotency key.");
  if (reason.length < 10 || reason.length > 500) throw new Error("Phase 7 acknowledgement persistence reason must be 10 through 500 characters.");
  if (!acknowledgement || typeof acknowledgement !== "object") throw new Error("Phase 7 acknowledgement persistence requires an acknowledgement record.");
  if (acknowledgement.policyVersion !== PHASE_7_MECHANICAL_SHADOW_ACKNOWLEDGEMENT_VERSION) throw new Error("Phase 7 acknowledgement persistence requires the Phase 7 acknowledgement policy.");
  if (!checksumOk(acknowledgement.acknowledgementChecksum) || !checksumOk(acknowledgement.readinessResultChecksum)) throw new Error("Phase 7 acknowledgement persistence requires acknowledgement and readiness checksums.");
  if (acknowledgement.executionAuthorized || acknowledgement.dispatchAuthorized || acknowledgement.repairAuthorized || acknowledgement.customerPresentationAuthorized || acknowledgement.pilotAuthorized || acknowledgement.productionAuthorized) throw new Error("Phase 7 acknowledgement persistence cannot record execution authority.");
  const normalized = {
    policyVersion: PHASE_7_MECHANICAL_ACKNOWLEDGEMENT_PERSISTENCE_BOUNDARY_VERSION,
    expectedCaseVersion,
    idempotencyKey,
    reason,
    appendOnly: true,
    subjectType: "DIAGNOSTIC_PHASE_7_MECHANICAL_SHADOW_ACKNOWLEDGEMENT",
    diagnosticCaseId: acknowledgement.diagnosticCaseId,
    family: acknowledgement.family,
    acknowledgementId: acknowledgement.id,
    acknowledgementChecksum: acknowledgement.acknowledgementChecksum,
    readinessResultChecksum: acknowledgement.readinessResultChecksum,
    acknowledgement
  };
  return { ...normalized, commandChecksum: hashEnterpriseCommand(normalized), authorityBoundary };
}

export function buildPhase7MechanicalPilotEvidencePackage(input: {
  occurredAt: string;
  builtBy: string;
  acknowledgements: readonly Phase7MechanicalShadowAcknowledgementRecord[];
  representativeCaseMinimum?: number;
  representativeFamilyMinimum?: number;
}) {
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Phase 7 pilot evidence package requires a valid timestamp.");
  if (!input.builtBy.trim()) throw new Error("Phase 7 pilot evidence package requires a builder.");
  const history = buildPhase7MechanicalAcknowledgementHistory(input.acknowledgements);
  const managerReview = buildPhase7MechanicalManagerReviewCard(history);
  const proof = runPhase7MechanicalProofCorpus();
  const representativeCaseMinimum = input.representativeCaseMinimum ?? 3;
  const representativeFamilyMinimum = input.representativeFamilyMinimum ?? 3;
  if (!Number.isInteger(representativeCaseMinimum) || representativeCaseMinimum < 1) throw new Error("Representative case minimum must be a positive integer.");
  if (!Number.isInteger(representativeFamilyMinimum) || representativeFamilyMinimum < 1 || representativeFamilyMinimum > 3) throw new Error("Representative family minimum must be between one and three.");
  const evidenceRecords = [
    { key: "PROOF_CORPUS", status: proof.passed ? "ACCEPTED" : "REJECTED", checksum: proof.runChecksum, note: `${proof.scenarioCount} Phase 7 proof scenarios across ${proof.familyCoverage.length} families.` },
    { key: "ACKNOWLEDGEMENT_HISTORY", status: history.replaySafe && history.recordCount >= representativeCaseMinimum ? "ACCEPTED" : "MISSING", checksum: history.historyChecksum, note: `${history.recordCount} acknowledgement records; minimum ${representativeCaseMinimum}.` },
    { key: "FAMILY_COVERAGE", status: history.reviewedFamilies.length >= representativeFamilyMinimum ? "ACCEPTED" : "MISSING", checksum: hashEnterpriseCommand(history.reviewedFamilies), note: `${history.reviewedFamilies.length} reviewed families; minimum ${representativeFamilyMinimum}.` },
    { key: "MANAGER_REVIEW_CARD", status: managerReview.status === "READY_FOR_MANAGER_REVIEW" ? "ACCEPTED" : "MISSING", checksum: managerReview.cardChecksum, note: managerReview.status },
    { key: "PERSISTENCE_BOUNDARY", status: "ACCEPTED", checksum: hashEnterpriseCommand(PHASE_7_MECHANICAL_ACKNOWLEDGEMENT_PERSISTENCE_BOUNDARY_VERSION), note: "Append-only command boundary is defined; durable database persistence is still gated." }
  ] as const;
  const holdCodes = unique([
    proof.passed ? "" : "P7M065_PROOF_CORPUS_NOT_ACCEPTED",
    history.replaySafe ? "" : "P7M065_ACK_HISTORY_NOT_REPLAY_SAFE",
    history.recordCount >= representativeCaseMinimum ? "" : "P7M065_REPRESENTATIVE_ACK_HISTORY_REQUIRED",
    history.reviewedFamilies.length >= representativeFamilyMinimum ? "" : "P7M065_REPRESENTATIVE_FAMILY_COVERAGE_REQUIRED",
    managerReview.status === "READY_FOR_MANAGER_REVIEW" ? "" : "P7M065_MANAGER_REVIEW_NOT_READY"
  ]);
  const result = {
    version: PHASE_7_MECHANICAL_PILOT_EVIDENCE_PACKAGE_VERSION,
    occurredAt: occurredAt.toISOString(),
    builtBy: input.builtBy.trim(),
    status: holdCodes.length ? "BLOCKED" as const : "READY_FOR_PILOT_EVIDENCE_REVIEW" as const,
    holdCodes,
    evidenceRecords,
    sourceVersions: [PHASE_7_MECHANICAL_PROOF_CORPUS_VERSION, PHASE_7_MECHANICAL_NEXT_TEST_READINESS_VERSION, PHASE_7_MECHANICAL_SHADOW_ACKNOWLEDGEMENT_VERSION, PHASE_7_MECHANICAL_ACKNOWLEDGEMENT_HISTORY_VERSION],
    history,
    managerReview,
    proofSummary: { corpusVersion: proof.corpusVersion, scenarioCount: proof.scenarioCount, familyCoverage: proof.familyCoverage, passed: proof.passed, runChecksum: proof.runChecksum },
    authorityBoundary
  };
  return { ...result, packageChecksum: hashEnterpriseCommand(result) };
}
