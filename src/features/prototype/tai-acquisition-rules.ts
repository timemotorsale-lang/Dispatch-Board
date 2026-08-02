export type TaiConfidence = "High" | "Medium" | "Low" | "Insufficient";
export type TaiRecommendation = "Buy" | "Buy up to" | "Manager review" | "Watch" | "Pass" | "Hold";

export type TaiAcquisitionInput = {
  acquisitionFees: number;
  comparablesReviewed: boolean;
  conditionInspected: boolean;
  conditionRisk: number;
  demandStrength: number;
  expectedRetail: number;
  holdingReserve: number;
  identityVerified: boolean;
  inventoryNeed: number;
  marketPosition: number;
  proposedPurchase: number;
  recon: number;
  riskReserve: number;
  sellerAuthorityVerified: boolean;
  targetGross: number;
  titleAndDocs: number;
  titleReviewed: boolean;
  transport: number;
};

export type TaiAcquisitionResult = {
  acquisitionScore: number;
  blockers: string[];
  confidence: TaiConfidence;
  expectedGross: number;
  explanation: string;
  negativeDrivers: string[];
  positiveDrivers: string[];
  purchaseCeiling: number;
  recommendation: TaiRecommendation;
  remainingRoom: number;
  totalInvestment: number;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const rating = (value: number) => clamp(Number.isFinite(value) ? value : 1, 1, 5);
const dollars = (value: number) => Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function evaluateTaiAcquisition(raw: TaiAcquisitionInput): TaiAcquisitionResult {
  const input = {
    ...raw,
    acquisitionFees: dollars(raw.acquisitionFees),
    conditionRisk: rating(raw.conditionRisk),
    demandStrength: rating(raw.demandStrength),
    expectedRetail: dollars(raw.expectedRetail),
    holdingReserve: dollars(raw.holdingReserve),
    inventoryNeed: rating(raw.inventoryNeed),
    marketPosition: rating(raw.marketPosition),
    proposedPurchase: dollars(raw.proposedPurchase),
    recon: dollars(raw.recon),
    riskReserve: dollars(raw.riskReserve),
    targetGross: dollars(raw.targetGross),
    titleAndDocs: dollars(raw.titleAndDocs),
    transport: dollars(raw.transport),
  };

  const nonPurchaseCosts = input.acquisitionFees + input.transport + input.recon + input.titleAndDocs + input.holdingReserve + input.riskReserve;
  const purchaseCeiling = Math.max(0, input.expectedRetail - input.targetGross - nonPurchaseCosts);
  const totalInvestment = input.proposedPurchase + nonPurchaseCosts;
  const expectedGross = input.expectedRetail - totalInvestment;
  const remainingRoom = purchaseCeiling - input.proposedPurchase;

  const demandPoints = input.demandStrength / 5 * 25;
  const inventoryPoints = input.inventoryNeed / 5 * 20;
  const marketPoints = input.marketPosition / 5 * 15;
  const riskPoints = (6 - input.conditionRisk) / 5 * 10;
  const economicsRatio = input.targetGross > 0 ? expectedGross / input.targetGross : expectedGross > 0 ? 1 : 0;
  const economicsPoints = clamp(economicsRatio, 0, 1) * 30;
  const acquisitionScore = Math.round(demandPoints + inventoryPoints + marketPoints + riskPoints + economicsPoints);

  const evidenceCount = [input.identityVerified, input.sellerAuthorityVerified, input.titleReviewed, input.conditionInspected, input.comparablesReviewed].filter(Boolean).length;
  const confidence: TaiConfidence = evidenceCount === 5 ? "High" : evidenceCount === 4 ? "Medium" : evidenceCount === 3 ? "Low" : "Insufficient";
  const blockers = [
    ...(!input.identityVerified ? ["Vehicle identity is not verified"] : []),
    ...(!input.sellerAuthorityVerified ? ["Seller authority is not verified"] : []),
    ...(!input.titleReviewed ? ["Title and ownership risk is not reviewed"] : []),
    ...(!input.conditionInspected ? ["Condition inspection is incomplete"] : []),
    ...(input.expectedRetail <= 0 ? ["Expected retail value is required"] : []),
    ...(purchaseCeiling <= 0 ? ["Retail-back economics do not support a purchase"] : []),
  ];

  let recommendation: TaiRecommendation;
  if (blockers.length) recommendation = "Hold";
  else if (confidence === "Insufficient" || confidence === "Low") recommendation = "Manager review";
  else if (input.proposedPurchase > purchaseCeiling) recommendation = acquisitionScore >= 55 ? "Watch" : "Pass";
  else if (acquisitionScore >= 85) recommendation = "Buy";
  else if (acquisitionScore >= 70) recommendation = "Buy up to";
  else if (acquisitionScore >= 55) recommendation = "Manager review";
  else recommendation = "Pass";

  const positiveDrivers = [
    ...(input.demandStrength >= 4 ? ["Strong expected local demand"] : []),
    ...(input.inventoryNeed >= 4 ? ["Fills a current TMS inventory need"] : []),
    ...(input.marketPosition >= 4 ? ["Favorable competitive market position"] : []),
    ...(remainingRoom >= 0 ? [`Proposed price is ${money(remainingRoom)} inside the retail-back ceiling`] : []),
    ...(expectedGross >= input.targetGross ? ["Expected gross meets dealership target"] : []),
  ].slice(0, 3);
  const negativeDrivers = [
    ...(input.conditionRisk >= 4 ? ["Condition exposure is elevated"] : []),
    ...(remainingRoom < 0 ? [`Proposed price is ${money(Math.abs(remainingRoom))} above the purchase ceiling`] : []),
    ...(expectedGross < input.targetGross ? [`Expected gross is ${money(input.targetGross - expectedGross)} below target`] : []),
    ...(!input.comparablesReviewed ? ["Comparable market evidence is incomplete"] : []),
    ...blockers,
  ].slice(0, 3);
  const explanation = blockers.length
    ? `Hold the opportunity until ${blockers[0].toLowerCase()}.`
    : recommendation === "Watch" || recommendation === "Pass"
      ? `${recommendation} at the current ${money(input.proposedPurchase)} proposal; the disciplined ceiling is ${money(purchaseCeiling)}.`
      : `${recommendation} at no more than ${money(purchaseCeiling)} based on retail-back economics, inventory fit, market position, and documented risk.`;

  return {
    acquisitionScore,
    blockers,
    confidence,
    expectedGross,
    explanation,
    negativeDrivers,
    positiveDrivers,
    purchaseCeiling,
    recommendation,
    remainingRoom,
    totalInvestment,
  };
}
