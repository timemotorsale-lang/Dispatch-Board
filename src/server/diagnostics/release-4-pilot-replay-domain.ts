import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import type { DiagnosticRelease4ReviewApprovalResult } from "./release-4-review-approval-domain";

export const DIAGNOSTIC_RELEASE_4_PILOT_REPLAY_VERSION = "DGN-054/PILOT-CASE-REPLAY/1.0.0";

export type DiagnosticPilotReplayCase = {
  caseId: string;
  caseType: "MECHANICAL" | "AUTOBODY";
  guideLaborMinutes: number;
  consoleLaborMinutes: number | null;
  actualLaborMinutes: number;
  consoleEstimateCents: number | null;
  actualEstimateCents: number;
  consoleAbstained: boolean;
  abstentionAppropriate: boolean;
  managerOverrideApplied: boolean;
  expectedItemCount: number;
  missedItemCount: number;
};

export type DiagnosticRelease4PilotReplayInput = {
  occurredAt: string;
  reviewApproval: Pick<DiagnosticRelease4ReviewApprovalResult, "status" | "resultChecksum">;
  cases: DiagnosticPilotReplayCase[];
};

export type DiagnosticRelease4PilotReplayResult = {
  version: string;
  occurredAt: string;
  status: "REPLAY_ACCEPTED" | "BLOCKED";
  caseCount: number;
  mechanicalCaseCount: number;
  autobodyCaseCount: number;
  metrics: {
    meanGuideVsActualLaborVariancePercent: number;
    meanConsoleVsActualLaborVariancePercent: number;
    meanEstimateVariancePercent: number;
    overrideRatePercent: number;
    missedItemRatePercent: number;
    abstentionQualityPercent: number;
  };
  reasonCodes: string[];
  warningCodes: string[];
  caseChecksums: { caseId: string; checksum: string }[];
  resultChecksum: string;
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const validChecksum = (value: string) => /^[0-9a-f]{64}$/.test(value);
const round = (value: number) => Math.round(value * 10) / 10;
const variance = (predicted: number, actual: number) => actual > 0 ? Math.abs(predicted - actual) / actual * 100 : 0;
const average = (values: number[]) => values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

export function evaluateDiagnosticRelease4PilotReplay(input: DiagnosticRelease4PilotReplayInput): DiagnosticRelease4PilotReplayResult {
  const mechanicalCaseCount = input.cases.filter((item) => item.caseType === "MECHANICAL").length;
  const autobodyCaseCount = input.cases.filter((item) => item.caseType === "AUTOBODY").length;
  const nonAbstained = input.cases.filter((item) => !item.consoleAbstained && item.consoleLaborMinutes !== null && item.consoleEstimateCents !== null);
  const abstained = input.cases.filter((item) => item.consoleAbstained);
  const expectedItems = input.cases.reduce((sum, item) => sum + item.expectedItemCount, 0);
  const missedItems = input.cases.reduce((sum, item) => sum + item.missedItemCount, 0);
  const invalidCases = input.cases.filter((item) => !item.caseId.trim()
    || item.guideLaborMinutes < 0
    || item.actualLaborMinutes <= 0
    || item.actualEstimateCents <= 0
    || item.expectedItemCount < 0
    || item.missedItemCount < 0
    || item.missedItemCount > item.expectedItemCount
    || (!item.consoleAbstained && (item.consoleLaborMinutes === null || item.consoleEstimateCents === null)));
  const metrics = {
    meanGuideVsActualLaborVariancePercent: average(input.cases.map((item) => variance(item.guideLaborMinutes, item.actualLaborMinutes))),
    meanConsoleVsActualLaborVariancePercent: average(nonAbstained.map((item) => variance(item.consoleLaborMinutes!, item.actualLaborMinutes))),
    meanEstimateVariancePercent: average(nonAbstained.map((item) => variance(item.consoleEstimateCents!, item.actualEstimateCents))),
    overrideRatePercent: input.cases.length ? round(input.cases.filter((item) => item.managerOverrideApplied).length / input.cases.length * 100) : 0,
    missedItemRatePercent: expectedItems ? round(missedItems / expectedItems * 100) : 0,
    abstentionQualityPercent: abstained.length ? round(abstained.filter((item) => item.abstentionAppropriate).length / abstained.length * 100) : 100
  };
  const reasonCodes = unique([
    input.reviewApproval.status === "READY_FOR_PILOT_REPLAY" ? "" : "DGN054_REVIEW_APPROVAL_GATE_REQUIRED",
    validChecksum(input.reviewApproval.resultChecksum) ? "" : "DGN054_REVIEW_APPROVAL_CHECKSUM_REQUIRED",
    input.cases.length >= 2 ? "" : "DGN054_REPRESENTATIVE_CASE_SET_REQUIRED",
    mechanicalCaseCount ? "" : "DGN054_MECHANICAL_CASE_REQUIRED",
    autobodyCaseCount ? "" : "DGN054_AUTOBODY_CASE_REQUIRED",
    invalidCases.length ? "DGN054_REPLAY_CASE_DATA_INVALID" : ""
  ]);
  const result = {
    version: DIAGNOSTIC_RELEASE_4_PILOT_REPLAY_VERSION,
    occurredAt: input.occurredAt,
    status: reasonCodes.length ? "BLOCKED" as const : "REPLAY_ACCEPTED" as const,
    caseCount: input.cases.length,
    mechanicalCaseCount,
    autobodyCaseCount,
    metrics,
    reasonCodes,
    warningCodes: unique([
      metrics.meanConsoleVsActualLaborVariancePercent > 20 ? "DGN054_LABOR_VARIANCE_REVIEW_REQUIRED" : "",
      metrics.meanEstimateVariancePercent > 20 ? "DGN054_ESTIMATE_VARIANCE_REVIEW_REQUIRED" : "",
      metrics.overrideRatePercent > 30 ? "DGN054_OVERRIDE_RATE_REVIEW_REQUIRED" : "",
      metrics.missedItemRatePercent > 10 ? "DGN054_MISSED_ITEM_RATE_REVIEW_REQUIRED" : "",
      metrics.abstentionQualityPercent < 90 ? "DGN054_ABSTENTION_QUALITY_REVIEW_REQUIRED" : ""
    ]),
    caseChecksums: input.cases.map((item) => ({ caseId: item.caseId, checksum: hashEnterpriseCommand(item) }))
  };
  return { ...result, resultChecksum: hashEnterpriseCommand({ input, result }) };
}
