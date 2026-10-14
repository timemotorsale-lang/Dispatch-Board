import { calculateMaximumBid, evaluateAppraisalConfidence } from "@/server/inventory/vehicle-decisions";

export const acquisitionCaseStatuses = ["EVIDENCE_REQUIRED", "READY_FOR_APPRAISAL", "APPRAISAL_REVIEW", "PROPOSAL_READY", "AUTHORIZATION_PENDING", "AUTHORIZED", "OFFER_PENDING", "COMMITMENT_ACCEPTED", "INVENTORY_UNIT_CREATED", "HANDOFF_READY", "WATCH", "DECLINED", "INSUFFICIENT", "REJECTED", "EXPIRED", "CANCELLED", "REVERSAL_REVIEW", "REVERSED", "EXCEPTION"] as const;
export type AcquisitionCaseStatus = (typeof acquisitionCaseStatuses)[number];

const string = (value: unknown, label: string) => { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); return result; };
const optionalString = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const integer = (value: unknown, label: string, minimum = 0) => { const result = Number(value); if (!Number.isInteger(result) || result < minimum) throw new Error(`${label} must be a whole number of at least ${minimum}.`); return result; };
const ratio = (value: unknown, label: string) => { const result = Number(value); if (!Number.isFinite(result) || result < 0 || result > 1) throw new Error(`${label} must be between 0 and 1.`); return result; };
const date = (value: unknown, label: string) => { const result = new Date(String(value)); if (Number.isNaN(result.getTime())) throw new Error(`${label} is invalid.`); return result; };
const command = (value: Record<string, unknown>) => ({ expectedVersion: integer(value.expectedVersion, "Expected version"), idempotencyKey: string(value.idempotencyKey, "Idempotency key"), reason: string(value.reason, "Reason") });
export const normalizeAcquisitionCaseCommand = command;

export function normalizeAcquisitionCaseCreate(value: unknown, now: Date) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const acquisitionType = string(input.acquisitionType, "Acquisition type");
  if (!["PURCHASE", "TRADE", "CONSIGNMENT", "TRANSFER"].includes(acquisitionType)) throw new Error("Acquisition type is invalid.");
  const expiresAt = date(input.expiresAt, "Expiry"); if (expiresAt <= now) throw new Error("Acquisition opportunity expiry must be in the future.");
  return { ...command({ ...input, expectedVersion: 0 }), acquisitionType: acquisitionType as "PURCHASE" | "TRADE" | "CONSIGNMENT" | "TRANSFER", expiresAt, intendedUse: string(input.intendedUse, "Intended use"), locationId: string(input.locationId, "Location"), ownerUserId: string(input.ownerUserId, "Owner"), source: string(input.source, "Source"), sourceReference: string(input.sourceReference, "Source reference"), vehicleId: string(input.vehicleId, "Vehicle") };
}

export function normalizeEvidenceCommand(value: Record<string, unknown>) {
  const base = command(value); const evidenceObjectIds = Array.isArray(value.evidenceObjectIds) ? value.evidenceObjectIds.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  const identityConflict = value.identityConflict === true; const titleHistoryConflict = value.titleHistoryConflict === true; const sellerAuthorityVerified = value.sellerAuthorityVerified === true; const mileageVerified = value.mileageVerified === true;
  const snapshot = { conditionEvidence: ratio(value.conditionEvidence, "Condition evidence"), evidenceObjectIds, historyTitleEvidence: ratio(value.historyTitleEvidence, "History/title evidence"), identityConflict, mileage: integer(value.mileage, "Mileage"), mileageVerified, sellerAuthorityVerified, titleHistoryConflict, trimCertainty: ratio(value.trimCertainty, "Trim certainty"), vinDecodeQuality: ratio(value.vinDecodeQuality, "VIN decode quality"), observedAt: date(value.observedAt, "Evidence observed time").toISOString() };
  const blockers = [...(identityConflict ? ["IDENTITY_CONFLICT"] : []), ...(titleHistoryConflict ? ["TITLE_HISTORY_CONFLICT"] : []), ...(!sellerAuthorityVerified ? ["SELLER_AUTHORITY_UNVERIFIED"] : []), ...(!mileageVerified ? ["MILEAGE_UNVERIFIED"] : []), ...(evidenceObjectIds.length === 0 ? ["EVIDENCE_MISSING"] : [])];
  return { ...base, blockers, snapshot, status: blockers.length ? "INSUFFICIENT" as const : "READY_FOR_APPRAISAL" as const };
}

export function normalizeAppraisalCommand(value: Record<string, unknown>, now: Date) {
  const base = command(value); const comparableCount = integer(value.comparableCount, "Comparable count");
  const confidence = evaluateAppraisalConfidence({ comparableCount, comparableRecency: ratio(value.comparableRecency, "Comparable recency"), conditionEvidence: ratio(value.conditionEvidence, "Condition evidence"), historyTitleEvidence: ratio(value.historyTitleEvidence, "History/title evidence"), mileageVerified: value.mileageVerified === true, reconEstimateQuality: ratio(value.reconEstimateQuality, "Recon estimate quality"), trimCertainty: ratio(value.trimCertainty, "Trim certainty"), vinDecodeQuality: ratio(value.vinDecodeQuality, "VIN decode quality") });
  const expiresAt = date(value.expiresAt, "Appraisal expiry"); if (expiresAt <= now) throw new Error("Appraisal expiry must be in the future.");
  return { ...base, snapshot: { algorithmVersion: "appraisal-confidence/1.0.0", comparableCount, comparableSnapshot: Array.isArray(value.comparables) ? value.comparables : [], confidence: confidence.confidence, confidenceScore: confidence.score, estimatedFeesCents: integer(value.estimatedFeesCents, "Estimated fees"), estimatedReconCents: integer(value.estimatedReconCents, "Estimated recon"), expectedRetailCents: integer(value.expectedRetailCents, "Expected retail", 1), expiresAt: expiresAt.toISOString(), missingInputs: confidence.missingInputs, submittedAt: now.toISOString() }, status: confidence.maxBidAllowed ? "APPRAISAL_REVIEW" as const : "INSUFFICIENT" as const };
}

export function normalizeProposalCommand(value: Record<string, unknown>, appraisal: Record<string, unknown>, now: Date) {
  const base = command(value); const confidence = appraisal.confidence;
  const calculated = calculateMaximumBid({ acquisitionFees: integer(value.acquisitionFeesCents, "Acquisition fees"), appraisalConfidence: confidence === "HIGH" || confidence === "MEDIUM" || confidence === "LOW" ? confidence : "INSUFFICIENT", expectedHoldingCost: integer(value.expectedHoldingCostCents, "Holding cost"), expectedReconCost: integer(appraisal.estimatedReconCents, "Estimated recon"), expectedRetailProceeds: integer(appraisal.expectedRetailCents, "Expected retail"), otherAcquisitionCosts: integer(value.otherAcquisitionCostsCents, "Other acquisition costs"), riskReserve: integer(value.riskReserveCents, "Risk reserve"), sellingCosts: integer(value.sellingCostsCents, "Selling costs"), targetGross: integer(value.targetGrossCents, "Target gross"), titleAndMerchandisingCosts: integer(value.titleAndMerchandisingCostsCents, "Title and merchandising costs"), transportCost: integer(value.transportCostCents, "Transport cost") });
  const policyCeilingCents = integer(value.policyCeilingCents, "Policy ceiling", 1); const recommendation = calculated.recommendedMaximumBid == null ? null : Math.min(calculated.recommendedMaximumBid, policyCeilingCents);
  return { ...base, eligible: calculated.eligible, snapshot: { ...calculated, algorithmVersion: "maximum-bid/1.0.0", calculatedAt: now.toISOString(), expiresAt: String(appraisal.expiresAt), humanDecisionRequired: true, policyCeilingCents, recommendedMaximumBidCents: recommendation, sensitivity: { retailMinusFivePercentCents: Math.max(0, Math.round(Number(appraisal.expectedRetailCents) * .95) - (Number(appraisal.expectedRetailCents) - (recommendation ?? 0))) } } };
}

export function normalizeAuthorizationRequest(value: Record<string, unknown>, recommendation: Record<string, unknown>, now: Date) {
  const base = command(value); const proposedAmountCents = integer(value.proposedAmountCents, "Proposed amount", 1); const maximum = integer(recommendation.recommendedMaximumBidCents, "Recommended maximum bid", 1);
  if (proposedAmountCents > maximum) throw new Error("Proposed amount exceeds the governed maximum bid.");
  const expiresAt = date(value.expiresAt, "Authorization expiry"); if (expiresAt <= now) throw new Error("Authorization expiry must be in the future.");
  return { ...base, snapshot: { appraisalVersion: integer(value.appraisalVersion, "Appraisal version", 1), conflictDisclosure: string(value.conflictDisclosure, "Conflict disclosure"), expiresAt: expiresAt.toISOString(), policyVersion: string(value.policyVersion, "Policy version"), proposedAmountCents, recommendationVersion: string(recommendation.algorithmVersion, "Recommendation version"), requestedAt: now.toISOString(), requesterUserId: string(value.requesterUserId, "Requester") } };
}

export function normalizeAuthorizationDecision(value: Record<string, unknown>, authorization: Record<string, unknown>, actorUserId: string, now: Date) {
  const base = command(value); const disposition = string(value.disposition, "Disposition"); if (!["APPROVED", "REJECTED"].includes(disposition)) throw new Error("Authorization disposition is invalid.");
  if (authorization.requesterUserId === actorUserId) throw new Error("Requester cannot approve their own acquisition authorization.");
  if (date(authorization.expiresAt, "Authorization expiry") <= now) throw new Error("Acquisition authorization has expired.");
  return { ...base, disposition: disposition as "APPROVED" | "REJECTED", snapshot: { ...authorization, decidedAt: now.toISOString(), decidedByUserId: actorUserId, decisionReason: base.reason, disposition } };
}

export function normalizeOfferCommand(value: Record<string, unknown>, authorization: Record<string, unknown>, now: Date, previousOffer: Record<string, unknown> = {}) {
  const base = command(value); if (authorization.disposition !== "APPROVED") throw new Error("An approved acquisition authorization is required.");
  const amountCents = integer(value.amountCents, "Offer amount", 1); if (amountCents > integer(authorization.proposedAmountCents, "Approved amount", 1)) throw new Error("Offer amount exceeds the exact approved amount.");
  const accepted = value.accepted === true; const acceptanceEvidenceReference = optionalString(value.acceptanceEvidenceReference); if (accepted && !acceptanceEvidenceReference) throw new Error("Accepted commitment requires an evidence reference.");
  const version = integer(value.offerVersion, "Offer version", 1); const expectedVersion = Number(previousOffer.version ?? 0) + 1; if (version !== expectedVersion) throw new Error(`Offer version must be ${expectedVersion}.`);
  return { ...base, accepted, snapshot: { acceptanceEvidenceReference, accepted, amountCents, currency: "USD", externalAcknowledgement: "NOT_CONNECTED", recordedAt: now.toISOString(), terms: string(value.terms, "Offer terms"), version } };
}

export function normalizeFinancialAcquisition(value: Record<string, unknown>, commitment: Record<string, unknown>, now: Date) {
  const base = command(value); if (commitment.accepted !== true || !commitment.acceptanceEvidenceReference) throw new Error("Accepted commitment evidence is required before inventory creation.");
  const effectiveAt = date(value.effectiveAt, "Financial acquisition time"); if (effectiveAt > now) throw new Error("Financial acquisition time cannot be in the future.");
  const targetAt = date(value.targetAt, "Stage target"); if (targetAt <= effectiveAt) throw new Error("Stage target must be after financial acquisition.");
  return { ...base, effectiveAt, inventoryNumber: string(value.inventoryNumber, "Inventory number"), nextAction: string(value.nextAction, "Next action"), ownerUserId: string(value.ownerUserId, "Inventory owner"), targetAt };
}

export function normalizeAcquisitionReversal(value: Record<string, unknown>, actorUserId: string, now: Date) { const base = command(value), evidenceObjectIds = Array.isArray(value.evidenceObjectIds) ? value.evidenceObjectIds.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [], verifiedByUserId = string(value.verifiedByUserId, "Independent reversal verifier"); if (verifiedByUserId === actorUserId) throw new Error("Acquisition reversal requires an independent verifier."); if (!evidenceObjectIds.length) throw new Error("Acquisition reversal requires compensation evidence."); const compensation = { custody: string(value.custodyDisposition, "Custody disposition"), payment: string(value.paymentDisposition, "Payment disposition"), title: string(value.titleDisposition, "Title disposition") }; return { ...base, compensation, evidenceObjectIds, reversedAt: now, verifiedByUserId }; }
