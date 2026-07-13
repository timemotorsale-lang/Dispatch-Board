import type { DecisionConfidence, InventoryDecision, InventoryRiskFlags } from "./domain";
import { evaluateHardRule } from "./domain";
import { clamp, normalize, score100, stableFingerprint, weightedScore } from "./math";

export function scoreMarketFit(input: {
  competitiveScarcity: number;
  currentCategoryConcentration: number;
  customerIntentEvidence: number;
  historicalStorePerformance: number;
  localDemand: number;
  priceBandFit: number;
}) {
  return weightedScore([
    { value: input.localDemand, weight: 30 },
    { value: input.historicalStorePerformance, weight: 25 },
    { value: input.competitiveScarcity, weight: 15 },
    { value: input.priceBandFit, weight: 10 },
    { value: input.customerIntentEvidence, weight: 10 },
    { value: clamp(1 - input.currentCategoryConcentration, 0, 1), weight: 10 }
  ]);
}

export function scoreAcquisitionOpportunity(input: {
  appraisalConfidence: number;
  capitalConcentrationRisk: number;
  evaluatedAt: Date;
  expectedGrossQuality: number;
  expectedTurnSpeed: number;
  historicalStoreFit: number;
  marketDemandFit: number;
  merchandisingAppeal: number;
  reconRisk: number;
  strategicNeed: number;
  titleHistoryRisk: number;
  vehicleId: string;
}): InventoryDecision<{ recommendation: "PURSUE" | "INSPECT_FURTHER" | "WATCH" | "DECLINE" }> {
  const score = score100(
    clamp(input.marketDemandFit, 0, 1) * 25 +
    clamp(input.expectedGrossQuality, 0, 1) * 20 +
    clamp(input.expectedTurnSpeed, 0, 1) * 15 +
    clamp(input.historicalStoreFit, 0, 1) * 10 +
    clamp(input.merchandisingAppeal, 0, 1) * 10 +
    clamp(input.appraisalConfidence, 0, 1) * 10 +
    clamp(input.strategicNeed, 0, 1) * 10 -
    clamp(input.reconRisk, 0, 1) * 15 -
    clamp(input.titleHistoryRisk, 0, 1) * 10 -
    clamp(input.capitalConcentrationRisk, 0, 1) * 10
  );
  const recommendation = score >= 70 ? "PURSUE" : score >= 50 ? "INSPECT_FURTHER" : score >= 30 ? "WATCH" : "DECLINE";
  const reasonCodes = [
    ...(input.marketDemandFit >= 0.75 ? ["ACQUISITION_MARKET_FIT_HIGH"] : []),
    ...(input.reconRisk >= 0.6 ? ["ACQUISITION_RECON_RISK"] : []),
    ...(input.titleHistoryRisk >= 0.5 ? ["ACQUISITION_TITLE_HISTORY_RISK"] : []),
    ...(input.capitalConcentrationRisk >= 0.6 ? ["ACQUISITION_CAPITAL_CONCENTRATION"] : [])
  ];
  return {
    algorithmVersion: "acquisition-opportunity/1.0.0",
    confidence: input.appraisalConfidence >= 0.8 ? "HIGH" : input.appraisalConfidence >= 0.6 ? "MEDIUM" : "LOW",
    decisionType: "VEHICLE_ACQUISITION_OPPORTUNITY",
    eligible: input.appraisalConfidence > 0,
    evaluatedAt: input.evaluatedAt,
    explanation: `Acquisition opportunity is ${score}/100 with a ${recommendation.toLowerCase().replaceAll("_", " ")} recommendation.`,
    hardRuleCode: null,
    inputFingerprint: stableFingerprint(input),
    managerReviewRequired: recommendation === "PURSUE" || input.titleHistoryRisk >= 0.5,
    missingInputs: input.appraisalConfidence > 0 ? [] : ["appraisalEvidence"],
    priority: recommendation === "PURSUE" ? "HIGH" : "NORMAL",
    reasonCodes,
    result: { recommendation },
    score,
    subject: { id: input.vehicleId, type: "VEHICLE" }
  };
}

export function evaluateAppraisalConfidence(input: {
  comparableCount: number;
  comparableRecency: number;
  conditionEvidence: number;
  historyTitleEvidence: number;
  mileageVerified: boolean;
  reconEstimateQuality: number;
  trimCertainty: number;
  vinDecodeQuality: number;
}) {
  const score = weightedScore([
    { value: input.vinDecodeQuality, weight: 15 },
    { value: input.trimCertainty, weight: 10 },
    { value: input.mileageVerified ? 1 : 0, weight: 10 },
    { value: input.conditionEvidence, weight: 15 },
    { value: normalize(input.comparableCount, 0, 8), weight: 15 },
    { value: input.comparableRecency, weight: 10 },
    { value: input.historyTitleEvidence, weight: 15 },
    { value: input.reconEstimateQuality, weight: 10 }
  ]);
  const confidence: DecisionConfidence = score >= 85 ? "HIGH" : score >= 65 ? "MEDIUM" : score >= 40 ? "LOW" : "INSUFFICIENT";
  return {
    confidence,
    maxBidAllowed: confidence === "HIGH" || confidence === "MEDIUM",
    missingInputs: [
      ...(!input.mileageVerified ? ["verifiedMileage"] : []),
      ...(input.comparableCount < 3 ? ["sufficientComparables"] : []),
      ...(input.historyTitleEvidence < 0.5 ? ["historyTitleEvidence"] : [])
    ],
    score
  };
}

export function calculateMaximumBid(input: {
  acquisitionFees: number;
  appraisalConfidence: DecisionConfidence;
  expectedHoldingCost: number;
  expectedReconCost: number;
  expectedRetailProceeds: number;
  otherAcquisitionCosts: number;
  riskReserve: number;
  sellingCosts: number;
  targetGross: number;
  titleAndMerchandisingCosts: number;
  transportCost: number;
}) {
  if (input.appraisalConfidence === "LOW" || input.appraisalConfidence === "INSUFFICIENT") {
    return {
      eligible: false,
      hardRuleCode: "INSUFFICIENT_APPRAISAL_EVIDENCE" as const,
      maximumAllInCost: null,
      recommendedMaximumBid: null
    };
  }
  const maximumAllInCost = Math.max(
    0,
    input.expectedRetailProceeds - input.targetGross - input.expectedReconCost - input.expectedHoldingCost -
    input.titleAndMerchandisingCosts - input.sellingCosts - input.riskReserve
  );
  const recommendedMaximumBid = Math.max(0, maximumAllInCost - input.acquisitionFees - input.transportCost - input.otherAcquisitionCosts);
  return { eligible: true, hardRuleCode: null, maximumAllInCost, recommendedMaximumBid };
}

export function evaluateReconCostVariance(input: {
  approvedCost: number;
  committedCost: number;
  incurredCost: number;
  remainingForecast: number;
  varianceApprovalThreshold: number;
}) {
  const forecastAtCompletion = input.incurredCost + input.committedCost + input.remainingForecast;
  const variance = forecastAtCompletion - input.approvedCost;
  const variancePercent = input.approvedCost > 0 ? variance / input.approvedCost : variance > 0 ? 1 : 0;
  return {
    approvalRequired: variance > input.varianceApprovalThreshold,
    forecastAtCompletion,
    variance,
    variancePercent
  };
}

export function calculateCarryingCost(input: {
  annualCapitalRate: number;
  dailyInsuranceAndStorage: number;
  daysHeld: number;
  inventoryCapital: number;
  opportunityCostPerDay: number;
}) {
  const capitalCost = input.inventoryCapital * Math.max(0, input.annualCapitalRate) * Math.max(0, input.daysHeld) / 365;
  const operatingCost = (Math.max(0, input.dailyInsuranceAndStorage) + Math.max(0, input.opportunityCostPerDay)) * Math.max(0, input.daysHeld);
  return { capitalCost, operatingCost, total: capitalCost + operatingCost };
}

export function recommendAgingAction(input: {
  carryingCostPressure: number;
  comparableMovement: number;
  frontlineAgeDays: number;
  grossFloorProtected: boolean;
  leadAndVdpActivity: number;
  marketPricePosition: number;
  merchandisingComplete: boolean;
}) {
  if (!input.merchandisingComplete) return { action: "IMPROVE_MERCHANDISING" as const, reasonCodes: ["MERCH_NOT_COMPLETE"] };
  if (input.frontlineAgeDays >= 60 && input.leadAndVdpActivity < 0.25) return { action: "DISPOSITION_REVIEW" as const, reasonCodes: ["AGE_FRONTLINE_60_PLUS", "MERCH_ACTIVITY_LOW"] };
  if (input.frontlineAgeDays >= 30 && input.marketPricePosition > 0.75 && input.comparableMovement < 0.5) return { action: "MANAGER_PRICE_REVIEW" as const, reasonCodes: ["AGE_MARKET_POSITION_HIGH"] };
  if (input.carryingCostPressure >= 0.75 && input.grossFloorProtected) return { action: "TARGETED_PROMOTION" as const, reasonCodes: ["COST_CARRYING_PRESSURE_HIGH"] };
  return { action: "HOLD_AND_MONITOR" as const, reasonCodes: ["AGE_WITHIN_ACTIVE_STRATEGY"] };
}

export function scoreDisposition(input: {
  carryingCostTrajectory: number;
  customerIntentStrength: number;
  expectedRetailGrossQuality: number;
  expectedTimeToRetailSale: number;
  locationFit: number;
  reconOrTitleExposure: number;
  wholesaleRecoveryQuality: number;
}) {
  const retailHoldScore = weightedScore([
    { value: input.expectedRetailGrossQuality, weight: 30 },
    { value: clamp(1 - input.expectedTimeToRetailSale, 0, 1), weight: 20 },
    { value: input.customerIntentStrength, weight: 20 },
    { value: input.locationFit, weight: 15 },
    { value: clamp(1 - input.carryingCostTrajectory, 0, 1), weight: 10 },
    { value: clamp(1 - input.reconOrTitleExposure, 0, 1), weight: 5 }
  ]);
  const exitScore = weightedScore([
    { value: input.wholesaleRecoveryQuality, weight: 40 },
    { value: input.carryingCostTrajectory, weight: 25 },
    { value: input.expectedTimeToRetailSale, weight: 20 },
    { value: input.reconOrTitleExposure, weight: 15 }
  ]);
  return {
    exitScore,
    recommendation: exitScore > retailHoldScore ? "DISPOSITION_REVIEW" : "CONTINUE_RETAIL",
    retailHoldScore
  } as const;
}

export function rankLotLocations(candidates: Array<{
  capacityFit: number;
  customerVisibilityFit: number;
  id: string;
  movementTimeFit: number;
  nextWorkflowFit: number;
  safetyEligible: boolean;
}>) {
  return candidates
    .filter((candidate) => candidate.safetyEligible)
    .map((candidate) => ({
      ...candidate,
      score: weightedScore([
        { value: candidate.nextWorkflowFit, weight: 40 },
        { value: candidate.capacityFit, weight: 25 },
        { value: candidate.movementTimeFit, weight: 20 },
        { value: candidate.customerVisibilityFit, weight: 15 }
      ])
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function evaluatePurchaseAuthorization(input: { authorized: boolean; riskFlags?: InventoryRiskFlags }) {
  const hardRuleCode = evaluateHardRule({ ...input.riskFlags, financialAuthorizationMissing: !input.authorized });
  return { allowed: !hardRuleCode, hardRuleCode };
}

