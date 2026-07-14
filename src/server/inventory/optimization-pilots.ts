/** M10 forecast and recommendation pilot controls (VEH-133–136).
 * Pure functions keep evaluation deterministic and make the controls safe to
 * run in shadow mode before any manager-facing or write-capable integration.
 */

export type PilotDisposition = "READY" | "BLOCKED";
export interface PilotResult { disposition: PilotDisposition; blockers: string[]; checks: Record<string, boolean>; }
const gate = (checks: Record<string, boolean>): PilotResult => {
  const blockers = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name.toUpperCase());
  return { disposition: blockers.length ? "BLOCKED" : "READY", blockers, checks };
};

export interface ForecastEvaluationInput {
  trainingCutoff: string;
  actuals: number[];
  forecasts: number[];
  baselineForecasts?: number[];
  missingDataCount?: number;
  driftScore?: number;
  maximumDriftScore?: number;
  uncertaintyCoverage?: number;
  minimumUncertaintyCoverage?: number;
  approved?: boolean;
}

/** VEH-133: records backtest error and blocks unapproved or unreliable models. */
export function evaluateForecast(input: ForecastEvaluationInput) {
  const pairs = Math.min(input.actuals.length, input.forecasts.length);
  const errors = Array.from({ length: pairs }, (_, i) => Math.abs(input.actuals[i]! - input.forecasts[i]!));
  const mae = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null;
  const baselinePairs = Math.min(input.actuals.length, input.baselineForecasts?.length ?? 0);
  const baselineMae = baselinePairs ? input.actuals.slice(0, baselinePairs).reduce((s, a, i) => s + Math.abs(a - input.baselineForecasts![i]!), 0) / baselinePairs : null;
  const checks = {
    trainingCutoffValid: !Number.isNaN(Date.parse(input.trainingCutoff)),
    hasBacktest: pairs > 0,
    noMissingData: (input.missingDataCount ?? 0) === 0,
    driftWithinLimit: (input.driftScore ?? 0) <= (input.maximumDriftScore ?? 1),
    uncertaintyCovered: (input.uncertaintyCoverage ?? 1) >= (input.minimumUncertaintyCoverage ?? 0.8),
    beatsBaseline: baselineMae === null || (mae !== null && mae <= baselineMae),
    approved: input.approved === true
  };
  return { ...gate(checks), mae, baselineMae, sampleCount: pairs, evaluatedAt: new Date().toISOString() };
}

export interface CapacityPilotInput { shadowMode: boolean; hardRulesPassed: boolean; baselineScore: number; recommendationScore: number; managerPreviewApproved?: boolean; }
/** VEH-134: recommendations must remain shadow/manager-preview and improve baseline. */
export function evaluateCapacityPilot(input: CapacityPilotInput) {
  return gate({ shadowOrPreview: input.shadowMode || input.managerPreviewApproved === true, hardRules: input.hardRulesPassed, outperformsBaseline: input.recommendationScore >= input.baselineScore });
}

export interface InventoryPilotInput { explainable: boolean; outcomeTracked: boolean; selfExecuting: boolean; dataFresh: boolean; managerPreviewApproved?: boolean; }
/** VEH-135: inventory advice is advisory only and requires traceable outcomes. */
export function evaluateInventoryPilot(input: InventoryPilotInput) {
  return gate({ explainable: input.explainable, outcomeTracked: input.outcomeTracked, advisoryOnly: !input.selfExecuting, dataFresh: input.dataFresh, previewApproved: input.managerPreviewApproved !== false });
}

export interface ResponsibleSummaryInput { evidenceIds: string[]; uncertaintyIncluded: boolean; sensitiveDataRedacted: boolean; evaluated: boolean; fallbackAvailable: boolean; killSwitchEnabled: boolean; enabled: boolean; }
/** VEH-136: summary generation is gated by evidence, privacy, evaluation, and rollback controls. */
export function evaluateResponsibleSummary(input: ResponsibleSummaryInput) {
  return gate({ enabled: input.enabled, citesInternalEvidence: input.evidenceIds.length > 0, uncertaintyIncluded: input.uncertaintyIncluded, sensitiveDataRedacted: input.sensitiveDataRedacted, evaluated: input.evaluated, fallbackAvailable: input.fallbackAvailable, killSwitchEnabled: input.killSwitchEnabled });
}
