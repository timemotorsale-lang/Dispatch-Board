import type { InventoryDecision } from "./domain";
import {
  average,
  clamp,
  coefficientOfVariation,
  normalize,
  score100,
  stableFingerprint,
  standardDeviation,
  weightedScore
} from "./math";

export type PartClassification = `${"A" | "B" | "C"}${"X" | "Y" | "Z"}`;

export function classifyPartInventory(input: {
  annualConsumptionValue: number;
  cumulativePortfolioValueShare: number;
  demandHistory: number[];
}) {
  const abc = input.cumulativePortfolioValueShare <= 0.8 ? "A" : input.cumulativePortfolioValueShare <= 0.95 ? "B" : "C";
  const variability = coefficientOfVariation(input.demandHistory);
  const xyz = variability <= 0.5 ? "X" : variability <= 1 ? "Y" : "Z";
  return {
    annualConsumptionValue: Math.max(0, input.annualConsumptionValue),
    classification: `${abc}${xyz}` as PartClassification,
    countFrequencyDays: abc === "A" ? 30 : abc === "B" ? 90 : 180,
    demandVariability: variability
  };
}

export function forecastPartDemand(input: {
  history: number[];
  scheduledDemand: number;
  seasonalFactor?: number;
  trendFactor?: number;
}) {
  const history = input.history.map((value) => Math.max(0, value));
  const weightedTotal = history.reduce((sum, value, index) => sum + value * (index + 1), 0);
  const weightTotal = history.reduce((sum, _value, index) => sum + index + 1, 0);
  const baseline = weightTotal ? weightedTotal / weightTotal : 0;
  const forecast = Math.max(0, baseline * (input.seasonalFactor ?? 1) * (input.trendFactor ?? 1) + Math.max(0, input.scheduledDemand));
  const variability = coefficientOfVariation(history);
  return {
    confidence: history.length >= 6 && variability <= 0.75 ? "HIGH" : history.length >= 3 ? "MEDIUM" : "LOW",
    forecast,
    range: {
      high: forecast + standardDeviation(history),
      low: Math.max(0, forecast - standardDeviation(history))
    }
  } as const;
}

export function calculateReorderPolicy(input: {
  demandHistoryPerDay: number[];
  leadTimeDays: number;
  leadTimeStandardDeviationDays: number;
  onHand: number;
  onOrder: number;
  reserved: number;
  serviceLevelFactor: number;
}) {
  const meanDailyDemand = average(input.demandHistoryPerDay.map((value) => Math.max(0, value)));
  const demandDeviation = standardDeviation(input.demandHistoryPerDay);
  const safetyStock = Math.max(
    0,
    input.serviceLevelFactor * Math.sqrt(
      Math.max(0, input.leadTimeDays) * demandDeviation ** 2 +
      meanDailyDemand ** 2 * Math.max(0, input.leadTimeStandardDeviationDays) ** 2
    )
  );
  const reorderPoint = meanDailyDemand * Math.max(0, input.leadTimeDays) + safetyStock;
  const available = input.onHand + input.onOrder - input.reserved;
  return {
    available,
    meanDailyDemand,
    reorderNow: available <= reorderPoint,
    reorderPoint,
    safetyStock
  };
}

export function recommendOrderQuantity(input: {
  annualDemand: number;
  annualHoldingCostPerUnit: number;
  availableCapacity: number;
  currentAvailable: number;
  expirationLimit?: number;
  minimumOrder: number;
  orderCost: number;
  packSize: number;
  reorderPoint: number;
}) {
  const eoq = input.annualHoldingCostPerUnit > 0
    ? Math.sqrt((2 * Math.max(0, input.annualDemand) * Math.max(0, input.orderCost)) / input.annualHoldingCostPerUnit)
    : 0;
  const shortage = Math.max(0, input.reorderPoint - input.currentAvailable);
  const minimum = Math.max(input.minimumOrder, shortage, eoq);
  const packSize = Math.max(1, input.packSize);
  const rounded = Math.ceil(minimum / packSize) * packSize;
  const policyLimit = Math.min(input.availableCapacity, input.expirationLimit ?? Number.POSITIVE_INFINITY);
  return {
    constrained: rounded > policyLimit,
    economicOrderQuantity: eoq,
    recommendedQuantity: Math.max(0, Math.floor(Math.min(rounded, policyLimit) / packSize) * packSize)
  };
}

export type VendorCandidate = {
  approved: boolean;
  availability: number;
  correctPartAccuracy: number;
  deliveryReliability: number;
  fillRate: number;
  historicalServiceQuality: number;
  id: string;
  paymentTerms: number;
  returnConvenience: number;
  totalLandedCostQuality: number;
  warrantyPerformance: number;
};

export function scoreVendor(candidate: VendorCandidate, emergency = false) {
  if (!candidate.approved) {
    return { eligible: false, reasonCodes: ["VENDOR_NOT_APPROVED"], score: 0 };
  }
  const score = weightedScore([
    { value: candidate.availability, weight: emergency ? 30 : 25 },
    { value: candidate.deliveryReliability, weight: emergency ? 25 : 20 },
    { value: candidate.totalLandedCostQuality, weight: emergency ? 10 : 15 },
    { value: candidate.correctPartAccuracy, weight: 10 },
    { value: candidate.fillRate, weight: 10 },
    { value: candidate.returnConvenience, weight: 5 },
    { value: candidate.warrantyPerformance, weight: 5 },
    { value: candidate.paymentTerms, weight: emergency ? 0 : 5 },
    { value: candidate.historicalServiceQuality, weight: 5 }
  ]);
  return { eligible: true, reasonCodes: [emergency ? "VENDOR_EMERGENCY_POLICY" : "VENDOR_STANDARD_POLICY"], score };
}

export function evaluatePartsEtaRisk(input: {
  alternateSourceAvailable: boolean;
  backordered: boolean;
  deliveryReliability: number;
  evaluatedAt: Date;
  partId: string;
  promisedArrivalAt: Date;
  requiredAt: Date;
  shipmentProgress: number;
}) {
  const latenessHours = (input.promisedArrivalAt.getTime() - input.requiredAt.getTime()) / 3_600_000;
  const riskScore = score100(
    normalize(latenessHours, -24, 24) * 45 +
    (1 - clamp(input.deliveryReliability, 0, 1)) * 25 +
    (1 - clamp(input.shipmentProgress, 0, 1)) * 15 +
    (input.backordered ? 15 : 0)
  );
  return {
    alternateSourceRecommended: riskScore >= 60 && input.alternateSourceAvailable,
    onTimeConfidence: riskScore >= 70 ? "LOW" : riskScore >= 40 ? "MEDIUM" : "HIGH",
    reasonCodes: [
      ...(latenessHours > 0 ? ["PART_ETA_AFTER_REQUIRED_TIME"] : []),
      ...(input.backordered ? ["PART_BACKORDERED"] : []),
      ...(riskScore >= 60 ? ["PART_ETA_RISK_HIGH"] : [])
    ],
    riskScore
  };
}

export type PartAllocationCandidate = {
  approvedSubstitute: boolean;
  alternativesAvailable: number;
  customerCommitment: number;
  id: string;
  repairCriticalRatio: number;
  reservationAgeHours: number;
  revenueRelease: number;
  safetyImpact: number;
};

export function rankPartAllocations(candidates: PartAllocationCandidate[]) {
  return candidates
    .filter((candidate) => candidate.approvedSubstitute)
    .map((candidate) => ({
      ...candidate,
      score: weightedScore([
        { value: candidate.safetyImpact, weight: 30 },
        { value: candidate.customerCommitment, weight: 20 },
        { value: clamp(1 - candidate.repairCriticalRatio, 0, 1), weight: 20 },
        { value: candidate.revenueRelease, weight: 15 },
        { value: normalize(candidate.reservationAgeHours, 0, 72), weight: 10 },
        { value: clamp(1 - candidate.alternativesAvailable / 3, 0, 1), weight: 5 }
      ])
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function evaluateTransfer(input: {
  avoidedDelayCost: number;
  avoidedPurchaseCost: number;
  sourceLocationStockoutRisk: number;
  transferCost: number;
  transferTimeRisk: number;
}) {
  const benefit = input.avoidedPurchaseCost + input.avoidedDelayCost - input.transferCost - input.sourceLocationStockoutRisk - input.transferTimeRisk;
  return { benefit, recommendTransfer: benefit > 0 && input.sourceLocationStockoutRisk <= input.avoidedDelayCost };
}

export function scoreCycleCountPriority(input: {
  abcClass: "A" | "B" | "C";
  discrepancyRate: number;
  movementVelocity: number;
  negativeOrImpossibleBalance: boolean;
  shrinkageRisk: number;
  timeSinceLastCountDays: number;
}) {
  return score100(
    (input.abcClass === "A" ? 25 : input.abcClass === "B" ? 15 : 5) +
    clamp(input.movementVelocity, 0, 1) * 20 +
    clamp(input.discrepancyRate, 0, 1) * 20 +
    clamp(input.shrinkageRisk, 0, 1) * 15 +
    normalize(input.timeSinceLastCountDays, 0, input.abcClass === "A" ? 30 : input.abcClass === "B" ? 90 : 180) * 10 +
    (input.negativeOrImpossibleBalance ? 10 : 0)
  );
}

export function scoreObsolescenceRisk(input: {
  demandForecast: number;
  onHand: number;
  returnEligible: boolean;
  shelfAgeDays: number;
  superseded: boolean;
  transferDemand: number;
}) {
  const score = score100(
    normalize(input.shelfAgeDays, 30, 365) * 35 +
    clamp(1 - input.demandForecast / Math.max(1, input.onHand), 0, 1) * 30 +
    (input.superseded ? 20 : 0) +
    clamp(1 - input.transferDemand / Math.max(1, input.onHand), 0, 1) * 10 +
    (input.returnEligible ? -5 : 5)
  );
  return {
    action: score >= 75 ? "DISPOSITION_REVIEW" : score >= 50 ? "REDUCE_OR_TRANSFER" : "RETAIN",
    score
  } as const;
}

export function detectPartInventoryAnomalies(input: {
  duplicateReceipt: boolean;
  invoiceQuantity: number;
  issuedWithoutRepairOrder: boolean;
  manualAdjustmentsInPeriod: number;
  onHand: number;
  receivedQuantity: number;
  reserved: number;
}) {
  const reasonCodes: string[] = [];
  if (input.onHand < 0) reasonCodes.push("PART_NEGATIVE_ON_HAND");
  if (input.reserved > Math.max(0, input.onHand)) reasonCodes.push("PART_RESERVED_EXCEEDS_STOCK");
  if (input.issuedWithoutRepairOrder) reasonCodes.push("PART_ISSUE_WITHOUT_REPAIR_ORDER");
  if (input.duplicateReceipt) reasonCodes.push("PART_DUPLICATE_RECEIPT");
  if (input.receivedQuantity !== input.invoiceQuantity) reasonCodes.push("PART_RECEIPT_INVOICE_MISMATCH");
  if (input.manualAdjustmentsInPeriod >= 3) reasonCodes.push("PART_REPEATED_MANUAL_ADJUSTMENT");
  return { requiresVerification: reasonCodes.length > 0, reasonCodes };
}

export function scoreReturnRecoveryPriority(input: {
  creditValue: number;
  daysUntilDeadline: number;
  disputed: boolean;
  ownerAssigned: boolean;
}) {
  return score100(
    normalize(input.creditValue, 0, 1_000) * 40 +
    clamp(1 - input.daysUntilDeadline / 30, 0, 1) * 30 +
    (input.disputed ? 20 : 0) +
    (input.ownerAssigned ? 0 : 10)
  );
}

export function scoreReceivingPriority(input: {
  activeReservation: boolean;
  customerDeliveryImpact: number;
  overdueRepairImpact: number;
  safetyImpact: number;
}) {
  return weightedScore([
    { value: input.safetyImpact, weight: 35 },
    { value: input.customerDeliveryImpact, weight: 25 },
    { value: input.overdueRepairImpact, weight: 25 },
    { value: input.activeReservation ? 1 : 0, weight: 15 }
  ]);
}

export function evaluatePartControlDecision(input: {
  evaluatedAt: Date;
  partId: string;
  classification: PartClassification;
  cycleCountScore: number;
  obsolescenceScore: number;
}): InventoryDecision<{ action: string; classification: PartClassification }> {
  const score = Math.max(input.cycleCountScore, input.obsolescenceScore);
  const action = input.obsolescenceScore >= 75 ? "DISPOSITION_REVIEW" : input.cycleCountScore >= 65 ? "CYCLE_COUNT" : "MONITOR";
  return {
    algorithmVersion: "parts-control/1.0.0",
    confidence: "HIGH",
    decisionType: "PART_CONTROL",
    eligible: true,
    evaluatedAt: input.evaluatedAt,
    explanation: `${input.classification} part recommends ${action.toLowerCase().replaceAll("_", " ")}.`,
    hardRuleCode: null,
    inputFingerprint: stableFingerprint(input),
    managerReviewRequired: action === "DISPOSITION_REVIEW",
    missingInputs: [],
    priority: score >= 75 ? "HIGH" : "NORMAL",
    reasonCodes: [`PART_CLASS_${input.classification}`, `PART_ACTION_${action}`],
    result: { action, classification: input.classification },
    score,
    subject: { id: input.partId, type: "PART" }
  };
}
