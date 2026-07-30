import {
  hasRequiredAuditMetadata,
  type SalesConsoleAuditMetadata,
  type SalesOutcomeKind
} from "./sales-console-m50-record-command-contract";

export const salesOutcomeReasonCodes = [
  "price",
  "vehicle-fit",
  "credit",
  "duplicate",
  "no-response",
  "bought-elsewhere",
  "future-interest",
  "completed",
  "source-verification-needed"
] as const;

export type SalesOutcomeRecordingIntent = {
  opportunityId: string;
  outcome: SalesOutcomeKind;
  reasonCode: (typeof salesOutcomeReasonCodes)[number];
  sourceLink: string;
  evidenceIds: string[];
  nextAction?: string;
  audit: Partial<SalesConsoleAuditMetadata>;
};

export type SalesOutcomeRecordingDecision = {
  allowed: boolean;
  terminal: boolean;
  sourceSystemCloseWriteEnabled: false;
  reasons: string[];
};

const terminalOutcomes: SalesOutcomeKind[] = ["won", "lost", "disqualified", "duplicate"];
const evidenceRequiredOutcomes: SalesOutcomeKind[] = ["won", "duplicate", "disqualified"];

export function evaluateSalesOutcomeRecording(intent: SalesOutcomeRecordingIntent): SalesOutcomeRecordingDecision {
  const reasons: string[] = [];
  const terminal = terminalOutcomes.includes(intent.outcome);

  if (!intent.opportunityId) reasons.push("opportunity is required");
  if (!intent.reasonCode) reasons.push("reason code is required");
  if (!intent.sourceLink) reasons.push("source link is required");
  if (!hasRequiredAuditMetadata(intent.audit)) reasons.push("audit trail is required");
  if (evidenceRequiredOutcomes.includes(intent.outcome) && intent.evidenceIds.length === 0) {
    reasons.push("evidence is required for this outcome");
  }
  if (!terminal && !intent.nextAction) {
    reasons.push("non-terminal outcomes require a next action");
  }

  return {
    allowed: reasons.length === 0,
    terminal,
    sourceSystemCloseWriteEnabled: false,
    reasons
  };
}

export function salesOutcomeCloseWritesRemainGoverned(decision: SalesOutcomeRecordingDecision) {
  return decision.sourceSystemCloseWriteEnabled === false;
}
