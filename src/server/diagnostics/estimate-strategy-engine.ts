import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import { buildStandardDiagnosticEstimateDraftLines, type DiagnosticEstimateDraftLine, type DiagnosticEstimateStrategy } from "./estimate-advisor-domain";
import { evaluateDiagnosticLaborGuide, type DiagnosticLaborComplexityTier, type DiagnosticLaborGuideRecommendation } from "./labor-guide-domain";
import { evaluateDiagnosticPartsLaborEconomics, type DiagnosticPartDemandCandidate, type DiagnosticPartsLaborEconomicsResult } from "./parts-labor-economics-domain";
import type { DiagnosticRepairOperation } from "./repair-handoff-domain";

export const DIAGNOSTIC_ESTIMATE_STRATEGY_ENGINE_VERSION = "DGN-038/ESTIMATE-STRATEGY-ENGINE/1.0.0";

export type DiagnosticEstimateStrategyRegistryEntry = {
  key: DiagnosticEstimateStrategy;
  version: string;
  label: string;
  purpose: string;
  authorityBoundary: {
    advisoryOnly: true;
    customerPresentationProhibited: true;
    authorizationProhibited: true;
    partsPurchaseProhibited: true;
    dispatchMutationProhibited: true;
    repairJobCreationProhibited: true;
  };
};

export type DiagnosticEstimateStrategyEvaluationInput = {
  diagnosticCaseId: string;
  repairOrderId: string;
  operations: DiagnosticRepairOperation[];
  laborRateCents: number;
  partPlaceholderUnitCents?: number;
  selectedStrategy: DiagnosticEstimateStrategy;
  compareStrategies?: DiagnosticEstimateStrategy[];
  occurredAt: string;
};

export type DiagnosticEstimateStrategyOutput = {
  strategy: DiagnosticEstimateStrategy;
  strategyVersion: string;
  status: "DRAFTABLE" | "REVIEW_REQUIRED";
  draftLines: DiagnosticEstimateDraftLine[];
  totals: {
    laborSubtotalCents: number;
    partsSubtotalCents: number;
    feeSubtotalCents: number;
    totalBeforeTaxCents: number;
  };
  laborMinutes: number;
  effectiveLaborRateCents: number;
  explanationCodes: string[];
  requiredApprovalCodes: string[];
  warningCodes: string[];
  laborGuideRecommendations: DiagnosticLaborGuideRecommendation[];
  laborGuideResultChecksum: string;
  partDemandCandidates: DiagnosticPartDemandCandidate[];
  economicsResultChecksum: string;
  materialChargeCents: number;
  outputChecksum: string;
};

export type DiagnosticEstimateStrategyComparison = {
  baselineStrategy: DiagnosticEstimateStrategy;
  candidateStrategy: DiagnosticEstimateStrategy;
  laborDeltaCents: number;
  totalDeltaCents: number;
  explanationCodes: string[];
};

const authorityBoundary = {
  advisoryOnly: true,
  customerPresentationProhibited: true,
  authorizationProhibited: true,
  partsPurchaseProhibited: true,
  dispatchMutationProhibited: true,
  repairJobCreationProhibited: true
} as const;

export const DIAGNOSTIC_ESTIMATE_STRATEGY_REGISTRY: Record<DiagnosticEstimateStrategy, DiagnosticEstimateStrategyRegistryEntry> = {
  STANDARD_SHOP_MODEL: {
    key: "STANDARD_SHOP_MODEL",
    version: "DGN-038/STANDARD-SHOP-MODEL/1.0.0",
    label: "DispatchBoard Standard",
    purpose: "Safe baseline advisor draft using current shop labor rate and repair handoff operations.",
    authorityBoundary
  },
  THREE_TIER_LABOR_GUIDE_MODEL: {
    key: "THREE_TIER_LABOR_GUIDE_MODEL",
    version: "DGN-038/THREE-TIER-LABOR-GUIDE-MODEL/1.0.0",
    label: "Three-Tier Labor Guide",
    purpose: "Advisor-comparable low, medium, and high complexity labor model with visible tier rationale.",
    authorityBoundary
  },
  ELITE_ENTERPRISE_MODEL: {
    key: "ELITE_ENTERPRISE_MODEL",
    version: "DGN-038/ELITE-ENTERPRISE-MODEL/1.0.0",
    label: "Elite Enterprise",
    purpose: "Margin-aware strategy preview with short-job friction, complexity, and manager-review safeguards.",
    authorityBoundary
  }
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const cents = (value: number) => Math.max(0, Math.round(value));

function totals(draftLines: DiagnosticEstimateDraftLine[]) {
  const laborSubtotalCents = draftLines.filter((line) => line.type === "LABOR").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const partsSubtotalCents = draftLines.filter((line) => line.type === "PART").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const feeSubtotalCents = draftLines.filter((line) => line.type === "FEE").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  return { laborSubtotalCents, partsSubtotalCents, feeSubtotalCents, totalBeforeTaxCents: laborSubtotalCents + partsSubtotalCents + feeSubtotalCents };
}

function operationComplexity(operation: DiagnosticRepairOperation, laborGuide?: DiagnosticLaborGuideRecommendation): DiagnosticLaborComplexityTier {
  if (laborGuide) return laborGuide.complexityTier;
  const likely = operation.durationMinutes.likely;
  const complexitySignals = [
    operation.requiredSkills.some((skill) => /DIAGNOSTIC|PROGRAM|CALIBR|ELECTRICAL/i.test(skill)),
    operation.requiredCertifications.length > 0,
    operation.toolRequirements.length > 1,
    operation.bayRequirements.some((requirement) => /LIFT|ALIGN|SPECIAL/i.test(requirement)),
    operation.hazards.length > 0,
    likely >= 120
  ].filter(Boolean).length;
  if (complexitySignals >= 2) return "HIGH";
  if (likely >= 60 || complexitySignals === 1) return "MEDIUM";
  return "LOW";
}

function withLaborRate(lines: DiagnosticEstimateDraftLine[], laborRateCents: number, advisorNote: string) {
  return lines.map((line) => line.type === "LABOR" ? { ...line, unitPriceCents: laborRateCents, advisorNote: `${line.advisorNote} ${advisorNote}`.trim() } : line);
}

function strategyLines(input: DiagnosticEstimateStrategyEvaluationInput, strategy: DiagnosticEstimateStrategy, laborGuideRecommendations: DiagnosticLaborGuideRecommendation[], economicsEvaluation: DiagnosticPartsLaborEconomicsResult) {
  const baseLines = buildStandardDiagnosticEstimateDraftLines({
    operations: input.operations,
    laborRateCents: input.laborRateCents,
    partPlaceholderUnitCents: input.partPlaceholderUnitCents ?? 0
  });
  if (strategy === "STANDARD_SHOP_MODEL") return baseLines;

  const tiers = input.operations.map((operation) => operationComplexity(operation, laborGuideRecommendations.find((item) => item.sourceOperationKey === operation.key)));
  const highestTier = tiers.includes("HIGH") ? "HIGH" : tiers.includes("MEDIUM") ? "MEDIUM" : "LOW";
  const tierRateMultiplier = strategy === "THREE_TIER_LABOR_GUIDE_MODEL"
    ? highestTier === "HIGH" ? 1.08 : highestTier === "MEDIUM" ? 1 : 0.96
    : highestTier === "HIGH" ? 1.15 : highestTier === "MEDIUM" ? 1.05 : 1;
  const shortJobFrictionMultiplier = strategy === "ELITE_ENTERPRISE_MODEL" && input.operations.some((operation) => operation.durationMinutes.likely < 60) ? 1.12 : 1;
  const economicsRate = Math.max(...economicsEvaluation.laborEconomics.map((line) => line.effectiveLaborRateCents), input.laborRateCents);
  const rate = cents(Math.max(economicsRate, input.laborRateCents * tierRateMultiplier * shortJobFrictionMultiplier));
  return withLaborRate(baseLines, rate, `Strategy ${strategy} applied ${highestTier.toLowerCase()} labor complexity and kept output draft-only.`);
}

function buildStrategyOutput(input: DiagnosticEstimateStrategyEvaluationInput, strategy: DiagnosticEstimateStrategy, laborGuideEvaluation: ReturnType<typeof evaluateDiagnosticLaborGuide>, economicsEvaluation: DiagnosticPartsLaborEconomicsResult): DiagnosticEstimateStrategyOutput {
  const registry = DIAGNOSTIC_ESTIMATE_STRATEGY_REGISTRY[strategy];
  const draftLines = strategyLines(input, strategy, laborGuideEvaluation.recommendations, economicsEvaluation);
  const totalValues = totals(draftLines);
  const complexityTiers = laborGuideEvaluation.recommendations.map((recommendation) => recommendation.complexityTier);
  const warningCodes = [
    input.partPlaceholderUnitCents == null || input.partPlaceholderUnitCents === 0 ? "ESTIMATE_STRATEGY_PART_PRICING_PENDING" : "",
    complexityTiers.includes("HIGH") ? "ESTIMATE_STRATEGY_HIGH_COMPLEXITY_LABOR" : "",
    ...economicsEvaluation.warningCodes
  ];
  const requiredApprovalCodes = [
    strategy === "ELITE_ENTERPRISE_MODEL" ? "ESTIMATE_STRATEGY_MANAGER_REVIEW_RECOMMENDED" : "",
    complexityTiers.includes("HIGH") ? "ESTIMATE_STRATEGY_COMPLEXITY_REVIEW_RECOMMENDED" : "",
    ...economicsEvaluation.managerReviewCodes
  ];
  const explanationCodes = unique([
    "ESTIMATE_STRATEGY_ADVISORY_ONLY",
    "ESTIMATE_STRATEGY_LABOR_GUIDE_LINKED",
    "ESTIMATE_STRATEGY_PARTS_LABOR_ECONOMICS_LINKED",
    `ESTIMATE_STRATEGY_${strategy}`,
    ...complexityTiers.map((tier) => `LABOR_COMPLEXITY_${tier}`),
    ...laborGuideEvaluation.recommendations.flatMap((recommendation) => recommendation.explanationCodes)
  ]);
  const output = {
    strategy,
    strategyVersion: registry.version,
    status: requiredApprovalCodes.filter(Boolean).length ? "REVIEW_REQUIRED" as const : "DRAFTABLE" as const,
    draftLines,
    totals: totalValues,
    laborMinutes: input.operations.reduce((sum, operation) => sum + operation.durationMinutes.likely, 0),
    effectiveLaborRateCents: draftLines.find((line) => line.type === "LABOR")?.unitPriceCents ?? input.laborRateCents,
    explanationCodes,
    requiredApprovalCodes: unique(requiredApprovalCodes),
    warningCodes: unique([...warningCodes, ...laborGuideEvaluation.summary.warningCodes]),
    laborGuideRecommendations: laborGuideEvaluation.recommendations,
    laborGuideResultChecksum: laborGuideEvaluation.resultChecksum,
    partDemandCandidates: economicsEvaluation.partDemandCandidates,
    economicsResultChecksum: economicsEvaluation.resultChecksum,
    materialChargeCents: economicsEvaluation.totals.materialChargeCents
  };
  return { ...output, outputChecksum: hashEnterpriseCommand({ engineVersion: DIAGNOSTIC_ESTIMATE_STRATEGY_ENGINE_VERSION, input, output }) };
}

export function evaluateDiagnosticEstimateStrategies(input: DiagnosticEstimateStrategyEvaluationInput) {
  if (!input.operations.length) throw new Error("Estimate strategy evaluation requires at least one repair operation.");
  if (input.laborRateCents < 1 || !Number.isInteger(input.laborRateCents)) throw new Error("Estimate strategy evaluation requires a positive labor rate.");
  const laborGuideEvaluation = evaluateDiagnosticLaborGuide({ operations: input.operations, occurredAt: input.occurredAt });
  const economicsEvaluation = evaluateDiagnosticPartsLaborEconomics({ operations: input.operations, laborGuideRecommendations: laborGuideEvaluation.recommendations, baseLaborRateCents: input.laborRateCents, partPlaceholderUnitCents: input.partPlaceholderUnitCents ?? 0, occurredAt: input.occurredAt });
  const compareStrategies = unique([input.selectedStrategy, ...(input.compareStrategies ?? [])]) as DiagnosticEstimateStrategy[];
  const outputs = compareStrategies.map((strategy) => buildStrategyOutput(input, strategy, laborGuideEvaluation, economicsEvaluation));
  const selectedOutput = outputs.find((output) => output.strategy === input.selectedStrategy);
  if (!selectedOutput) throw new Error("Selected estimate strategy output was not generated.");
  const baseline = outputs.find((output) => output.strategy === "STANDARD_SHOP_MODEL") ?? selectedOutput;
  const comparisons: DiagnosticEstimateStrategyComparison[] = outputs.filter((output) => output.strategy !== baseline.strategy).map((output) => ({
    baselineStrategy: baseline.strategy,
    candidateStrategy: output.strategy,
    laborDeltaCents: output.totals.laborSubtotalCents - baseline.totals.laborSubtotalCents,
    totalDeltaCents: output.totals.totalBeforeTaxCents - baseline.totals.totalBeforeTaxCents,
    explanationCodes: ["ESTIMATE_STRATEGY_DELTA_VISIBLE", output.totals.totalBeforeTaxCents >= baseline.totals.totalBeforeTaxCents ? "ESTIMATE_STRATEGY_TOTAL_INCREASE" : "ESTIMATE_STRATEGY_TOTAL_DECREASE"]
  }));
  const result = {
    engineVersion: DIAGNOSTIC_ESTIMATE_STRATEGY_ENGINE_VERSION,
    selectedStrategy: input.selectedStrategy,
    selectedOutput,
    outputs,
    comparisons,
    registry: compareStrategies.map((strategy) => DIAGNOSTIC_ESTIMATE_STRATEGY_REGISTRY[strategy]),
    laborGuideEvaluation,
    economicsEvaluation,
    authorityBoundary
  };
  return { ...result, resultChecksum: hashEnterpriseCommand({ input, result }) };
}

