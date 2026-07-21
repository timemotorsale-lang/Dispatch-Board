import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import type { DiagnosticLaborGuideRecommendation } from "./labor-guide-domain";
import type { DiagnosticRepairOperation } from "./repair-handoff-domain";

export const DIAGNOSTIC_PARTS_LABOR_ECONOMICS_VERSION = "DGN-040-041/PARTS-LABOR-ECONOMICS/1.0.0";

export type DiagnosticPartClass = "OEM" | "AFTERMARKET" | "RECYCLED_LKQ" | "REMANUFACTURED" | "CLIP_FASTENER" | "MATERIAL" | "SUBLET" | "REVIEW_REQUIRED";
export type DiagnosticPricingStatus = "PLACEHOLDER" | "ESTIMATED" | "PENDING_PARTS_AUTHORITY";

export type DiagnosticPartsLaborEconomicsInput = {
  operations: DiagnosticRepairOperation[];
  laborGuideRecommendations: DiagnosticLaborGuideRecommendation[];
  baseLaborRateCents: number;
  partPlaceholderUnitCents?: number;
  occurredAt: string;
};

export type DiagnosticPartDemandCandidate = {
  demandKey: string;
  sourceOperationKey: string;
  partKey: string;
  description: string;
  quantity: number;
  partClass: DiagnosticPartClass;
  fitmentConfidence: "VIN_REVIEW_REQUIRED" | "OPERATION_DERIVED" | "LOW";
  pricingStatus: DiagnosticPricingStatus;
  estimatedCostCents: number;
  recommendedSellPriceCents: number;
  targetGrossProfitPercent: number;
  warningCodes: string[];
  authorityBoundary: {
    demandSignalOnly: true;
    purchaseMutationProhibited: true;
    reservationMutationProhibited: true;
    substitutionRequiresPartsAuthority: true;
  };
};

export type DiagnosticLaborEconomicsLine = {
  sourceOperationKey: string;
  domain: DiagnosticLaborGuideRecommendation["domain"];
  operationType: DiagnosticLaborGuideRecommendation["operationType"];
  complexityTier: DiagnosticLaborGuideRecommendation["complexityTier"];
  baseLaborRateCents: number;
  effectiveLaborRateCents: number;
  guideMinutes: number;
  billableMinutes: number;
  minimumApplied: boolean;
  shortJobBumpApplied: boolean;
  tierMultiplier: number;
  materialChargeCents: number;
  targetLaborGrossProfitPercent: number;
  warningCodes: string[];
  managerReviewCodes: string[];
};

export type DiagnosticPartsLaborEconomicsResult = {
  version: string;
  occurredAt: string;
  partDemandCandidates: DiagnosticPartDemandCandidate[];
  laborEconomics: DiagnosticLaborEconomicsLine[];
  totals: {
    recommendedPartsSellCents: number;
    materialChargeCents: number;
    effectiveLaborMinutes: number;
  };
  warningCodes: string[];
  managerReviewCodes: string[];
  authorityBoundary: {
    advisoryOnly: true;
    partsOrderProhibited: true;
    partsReservationProhibited: true;
    customerEstimateMutationProhibited: true;
    hiddenRepricingProhibited: true;
  };
  resultChecksum: string;
};

const authorityBoundary = {
  advisoryOnly: true,
  partsOrderProhibited: true,
  partsReservationProhibited: true,
  customerEstimateMutationProhibited: true,
  hiddenRepricingProhibited: true
} as const;

const demandBoundary = {
  demandSignalOnly: true,
  purchaseMutationProhibited: true,
  reservationMutationProhibited: true,
  substitutionRequiresPartsAuthority: true
} as const;

const canonical = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const cents = (value: number) => Math.max(0, Math.round(value));

function inferPartClass(partKey: string, description: string): DiagnosticPartClass {
  const text = `${partKey} ${description}`.toUpperCase();
  if (/CLIP|FASTENER|RIVET|BOLT|RETAINER|BRACKET/.test(text)) return "CLIP_FASTENER";
  if (/PAINT|MATERIAL|SEALER|ADHESIVE|PRIMER|HAZMAT|WAX/.test(text)) return "MATERIAL";
  if (/SUBLET|CALIBRATION|GLASS/.test(text)) return "SUBLET";
  if (/REMAN/.test(text)) return "REMANUFACTURED";
  if (/LKQ|RECYCLED|USED/.test(text)) return "RECYCLED_LKQ";
  if (/OEM/.test(text)) return "OEM";
  if (/BUMPER|FENDER|PANEL|HEADLAMP|LAMP|COVER|ALTERNATOR|ROTOR|PAD/.test(text)) return "REVIEW_REQUIRED";
  return "AFTERMARKET";
}

function targetPartsGp(partClass: DiagnosticPartClass) {
  if (partClass === "CLIP_FASTENER" || partClass === "MATERIAL") return 55;
  if (partClass === "SUBLET") return 25;
  if (partClass === "OEM") return 35;
  if (partClass === "RECYCLED_LKQ" || partClass === "REMANUFACTURED") return 40;
  return 45;
}

function sellFromCost(costCents: number, targetGpPercent: number) {
  if (costCents <= 0) return 0;
  return cents(costCents / (1 - targetGpPercent / 100));
}

function buildPartCandidates(input: DiagnosticPartsLaborEconomicsInput): DiagnosticPartDemandCandidate[] {
  return input.operations.flatMap((operation) => operation.parts.map((part) => {
    const partClass = inferPartClass(part.partKey, part.description);
    const estimatedCostCents = input.partPlaceholderUnitCents ?? 0;
    const targetGrossProfitPercent = targetPartsGp(partClass);
    const pricingStatus: DiagnosticPricingStatus = estimatedCostCents > 0 ? "ESTIMATED" : "PLACEHOLDER";
    return {
      demandKey: `DEMAND_${canonical(operation.key)}_${canonical(part.partKey)}`,
      sourceOperationKey: operation.key,
      partKey: canonical(part.partKey),
      description: part.description,
      quantity: part.quantity,
      partClass,
      fitmentConfidence: part.fitmentBasis.toUpperCase().includes("VIN") ? "VIN_REVIEW_REQUIRED" : "OPERATION_DERIVED",
      pricingStatus,
      estimatedCostCents,
      recommendedSellPriceCents: sellFromCost(estimatedCostCents, targetGrossProfitPercent),
      targetGrossProfitPercent,
      warningCodes: unique([
        pricingStatus === "PLACEHOLDER" ? "PARTS_DEMAND_PRICING_PENDING" : "",
        part.substituteReviewRequired ? "PARTS_DEMAND_SUBSTITUTE_REVIEW_REQUIRED" : "",
        partClass === "REVIEW_REQUIRED" ? "PARTS_DEMAND_CLASS_REVIEW_REQUIRED" : ""
      ]),
      authorityBoundary: demandBoundary
    };
  }));
}

function laborLine(recommendation: DiagnosticLaborGuideRecommendation, baseLaborRateCents: number): DiagnosticLaborEconomicsLine {
  const guideMinutes = recommendation.durationMinutes.likely;
  const minimumMinutes = recommendation.domain === "AUTOBODY" ? 30 : 60;
  const billableMinutes = Math.max(guideMinutes, minimumMinutes);
  const minimumApplied = billableMinutes > guideMinutes;
  const shortJobBumpApplied = guideMinutes < 60;
  const tierMultiplier = recommendation.complexityTier === "HIGH" ? 1.12 : recommendation.complexityTier === "MEDIUM" ? 1 : 0.96;
  const shortJobMultiplier = shortJobBumpApplied ? 1.18 : 1;
  const autobodySafetyMultiplier = recommendation.domain === "AUTOBODY" && ["ADAS_CALIBRATION", "FRAME_STRUCTURAL", "REFINISH"].includes(recommendation.operationType) ? 1.08 : 1;
  const effectiveLaborRateCents = cents(Math.min(baseLaborRateCents * tierMultiplier * shortJobMultiplier * autobodySafetyMultiplier, 26000));
  const materialChargeCents = recommendation.domain === "AUTOBODY" && ["REFINISH", "BLEND", "MATERIALS"].includes(recommendation.operationType)
    ? cents((billableMinutes / 60) * 4500 + 1500)
    : 0;
  const warningCodes = unique([
    minimumApplied ? "LABOR_ECONOMICS_MINIMUM_APPLIED" : "",
    shortJobBumpApplied ? "LABOR_ECONOMICS_SHORT_JOB_BUMP_APPLIED" : "",
    materialChargeCents > 0 ? "LABOR_ECONOMICS_MATERIAL_CHARGE_VISIBLE" : ""
  ]);
  const managerReviewCodes = unique([
    recommendation.complexityTier === "HIGH" ? "LABOR_ECONOMICS_HIGH_COMPLEXITY_REVIEW" : "",
    effectiveLaborRateCents >= cents(baseLaborRateCents * 1.2) ? "LABOR_ECONOMICS_RATE_INCREASE_REVIEW" : "",
    materialChargeCents > 0 ? "LABOR_ECONOMICS_MATERIAL_DISCOUNT_REVIEW_REQUIRED" : ""
  ]);
  return {
    sourceOperationKey: recommendation.sourceOperationKey,
    domain: recommendation.domain,
    operationType: recommendation.operationType,
    complexityTier: recommendation.complexityTier,
    baseLaborRateCents,
    effectiveLaborRateCents,
    guideMinutes,
    billableMinutes,
    minimumApplied,
    shortJobBumpApplied,
    tierMultiplier,
    materialChargeCents,
    targetLaborGrossProfitPercent: recommendation.domain === "AUTOBODY" ? 68 : 70,
    warningCodes,
    managerReviewCodes
  };
}

export function evaluateDiagnosticPartsLaborEconomics(input: DiagnosticPartsLaborEconomicsInput): DiagnosticPartsLaborEconomicsResult {
  if (!input.operations.length) throw new Error("Parts and labor economics requires at least one repair operation.");
  if (!input.laborGuideRecommendations.length) throw new Error("Parts and labor economics requires labor guide recommendations.");
  if (!Number.isInteger(input.baseLaborRateCents) || input.baseLaborRateCents < 1) throw new Error("Parts and labor economics requires a positive base labor rate.");
  const partDemandCandidates = buildPartCandidates(input);
  const laborEconomics = input.laborGuideRecommendations.map((recommendation) => laborLine(recommendation, input.baseLaborRateCents));
  const totals = {
    recommendedPartsSellCents: partDemandCandidates.reduce((sum, candidate) => sum + candidate.quantity * candidate.recommendedSellPriceCents, 0),
    materialChargeCents: laborEconomics.reduce((sum, line) => sum + line.materialChargeCents, 0),
    effectiveLaborMinutes: laborEconomics.reduce((sum, line) => sum + line.billableMinutes, 0)
  };
  const result = {
    version: DIAGNOSTIC_PARTS_LABOR_ECONOMICS_VERSION,
    occurredAt: input.occurredAt,
    partDemandCandidates,
    laborEconomics,
    totals,
    warningCodes: unique([...partDemandCandidates.flatMap((candidate) => candidate.warningCodes), ...laborEconomics.flatMap((line) => line.warningCodes)]),
    managerReviewCodes: unique(laborEconomics.flatMap((line) => line.managerReviewCodes)),
    authorityBoundary
  };
  return { ...result, resultChecksum: hashEnterpriseCommand({ input, result }) };
}

