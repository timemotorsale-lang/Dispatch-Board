import { createHash } from "node:crypto";

type JsonObject = Record<string, unknown>;
const channels = ["RETAIL", "INTERNAL_TRANSFER", "DEALER_NETWORK", "AUCTION", "WHOLESALE"] as const;

function object(value: unknown, label = "Request"): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as JsonObject;
}
function text(value: unknown, label: string, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; }
function optional(value: unknown, max = 500) { return value == null || value === "" ? null : text(value, "Value", max); }
function integer(value: unknown, label: string, min = 0) { const result = Number(value); if (!Number.isInteger(result) || result < min) throw new Error(`${label} must be a whole number of at least ${min}.`); return result; }
function date(value: unknown, label: string) { const result = new Date(text(value, label, 100)); if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date and time.`); return result; }
function list(value: unknown, label: string) { if (!Array.isArray(value)) throw new Error(`${label} must be a list.`); return [...new Set(value.map(item => typeof item === "string" ? item.trim() : "").filter(Boolean))]; }
function base(raw: JsonObject) { return { idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200), occurredAt: date(raw.occurredAt, "Occurrence time"), reason: text(raw.reason, "Business reason", 1000) }; }
function versioned(raw: JsonObject) { return { ...base(raw), expectedCaseVersion: integer(raw.expectedCaseVersion ?? 0, "Expected case version") }; }

export function normalizeCandidateCreate(value: unknown) {
  const raw = object(value), reasonCodes = list(raw.reasonCodes, "Candidate reasons"), targetAt = date(raw.targetAt, "Review target");
  if (!reasonCodes.length) throw new Error("At least one candidate reason is required.");
  if (raw.saleCondition != null && raw.saleCondition !== "AS_IS") throw new Error("Sale condition is invalid.");
  const asIsReview = raw.saleCondition === "AS_IS" ? { saleCondition: "AS_IS" as const, reconDecisionReason: text(raw.reconDecisionReason, "Recon decision reason", 2000), knownDefects: text(raw.knownDefects, "Known defects and condition disclosure", 4000) } : null;
  if (asIsReview && (asIsReview.reconDecisionReason.length < 10 || asIsReview.knownDefects.length < 10)) throw new Error("As-is decision and disclosure must each contain at least 10 characters.");
  return { ...base(raw), asIsReview, inventoryUnitId: text(raw.inventoryUnitId, "Inventory unit ID", 100), ownerUserId: text(raw.ownerUserId, "Owner user ID", 100), reasonCodes, targetAt };
}

export function assertAsIsBuyerAcknowledgment(candidateSnapshot: unknown, value: unknown) {
  const snapshots = Array.isArray(candidateSnapshot) ? candidateSnapshot : [];
  const isAsIs = snapshots.some(snapshot => {
    if (!snapshot || typeof snapshot !== "object") return false;
    const review = snapshot.asIsReview;
    return review && typeof review === "object" && review.saleCondition === "AS_IS";
  });
  if (!isAsIs) return;
  const raw = object(value);
  if (raw.buyerAcknowledgedDisclosures !== true) throw new Error("Buyer acknowledgment of as-is condition and known defects is required.");
  text(raw.buyerAcknowledgmentReference, "Buyer acknowledgment evidence reference", 1000);
}

export function normalizeCandidateReview(value: unknown) {
  const raw = object(value), disposition = text(raw.disposition, "Review disposition", 30).toUpperCase();
  if (!["ACCEPT", "DISMISS", "DEFER", "REOPEN"].includes(disposition)) throw new Error("Candidate review disposition is invalid.");
  const deferredUntil = raw.deferredUntil ? date(raw.deferredUntil, "Deferred-until time") : null;
  if (disposition === "DEFER" && !deferredUntil) throw new Error("Deferred review requires a follow-up time.");
  return { ...versioned(raw), deferredUntil, disposition };
}

export function normalizeDispositionAppraisal(value: unknown) {
  const raw = object(value), evidence = list(raw.evidence, "Appraisal evidence"), comparables = Array.isArray(raw.comparables) ? raw.comparables.map(item => object(item, "Comparable")) : [], confidence = text(raw.confidence, "Confidence", 20).toUpperCase();
  const lowCents = integer(raw.lowCents, "Valuation low"), highCents = integer(raw.highCents, "Valuation high"), expiresAt = date(raw.expiresAt, "Appraisal expiry");
  if (lowCents > highCents) throw new Error("Valuation low cannot exceed valuation high.");
  if (!evidence.length || !comparables.length) throw new Error("Appraisal requires evidence and at least one comparable.");
  if (!["LOW", "MEDIUM", "HIGH"].includes(confidence)) throw new Error("Appraisal confidence is invalid.");
  return { ...versioned(raw), assumptions: list(raw.assumptions ?? [], "Assumptions"), comparables, confidence, evidence, expiresAt, highCents, lowCents };
}

export function normalizeChannelProposal(value: unknown) {
  const raw = object(value), channel = text(raw.channel, "Channel", 40).toUpperCase() as (typeof channels)[number];
  if (!channels.includes(channel)) throw new Error("Disposition channel is invalid.");
  const askingCents = integer(raw.askingCents, "Asking amount"), reserveCents = integer(raw.reserveCents, "Reserve amount"), estimatedFeesCents = integer(raw.estimatedFeesCents, "Estimated fees"), grossFloorCents = integer(raw.grossFloorCents, "Gross floor");
  if (reserveCents > askingCents) throw new Error("Reserve cannot exceed asking amount.");
  if (reserveCents - estimatedFeesCents < grossFloorCents) throw new Error("Proposed net recovery is below the governed gross floor.");
  return { ...versioned(raw), alternatives: Array.isArray(raw.alternatives) ? raw.alternatives.map(item => object(item, "Channel alternative")) : [], appraisalVersion: integer(raw.appraisalVersion, "Appraisal version", 1), askingCents, channel, estimatedDays: integer(raw.estimatedDays, "Estimated disposition days"), estimatedFeesCents, expectedNetCents: reserveCents - estimatedFeesCents, grossFloorCents, policyVersion: text(raw.policyVersion, "Policy version", 100), reserveCents, risk: text(raw.risk, "Risk", 30).toUpperCase() };
}

export function normalizeProposalDecision(value: unknown) {
  const raw = object(value), decision = text(raw.decision, "Decision", 20).toUpperCase();
  if (!["APPROVED", "REJECTED", "RETURNED_FOR_REVISION"].includes(decision)) throw new Error("Proposal decision is invalid.");
  return { ...versioned(raw), amountCents: integer(raw.amountCents, "Approved amount"), decision, policyVersion: text(raw.policyVersion, "Policy version", 100), proposalVersion: integer(raw.proposalVersion, "Proposal version", 1) };
}

export function assertIndependentDispositionDecision(requestedByUserId: string, actorUserId: string) {
  if (requestedByUserId === actorUserId) throw new Error("Consequential disposition approval requires a different authorized user than the requester.");
}

export function normalizeActivation(value: unknown) {
  const raw = object(value), mode = text(raw.mode, "Activation mode", 20).toUpperCase(), status = text(raw.status, "Activation status", 40).toUpperCase();
  if (!["MANUAL", "SANDBOX", "CONNECTOR"].includes(mode) || !["REQUESTED", "PENDING_ACKNOWLEDGEMENT", "ACTIVE", "REJECTED", "FAILED_RETRYABLE", "FAILED_FINAL", "CANCELLED"].includes(status)) throw new Error("Activation mode or status is invalid.");
  const externalReference = optional(raw.externalReference, 200);
  if (status === "ACTIVE" && !externalReference) throw new Error("Active channel requires authoritative acknowledgement and an external reference.");
  return { ...versioned(raw), acknowledgement: optional(raw.acknowledgement, 1000), externalReference, mode, proposalVersion: integer(raw.proposalVersion, "Proposal version", 1), status };
}

export function normalizeOffer(value: unknown) {
  const raw = object(value), amountCents = integer(raw.amountCents, "Offer amount"), feesCents = integer(raw.feesCents, "Offer fees"), expiresAt = date(raw.expiresAt, "Offer expiry");
  if (expiresAt <= date(raw.occurredAt, "Occurrence time")) throw new Error("Offer expiry must follow receipt time.");
  return { ...versioned(raw), amountCents, expiresAt, externalOfferId: text(raw.externalOfferId, "External offer ID", 200), feesCents, netCents: amountCents - feesCents, source: text(raw.source, "Offer source", 100), terms: list(raw.terms ?? [], "Offer terms") };
}

export function normalizeOfferDecision(value: unknown) {
  const raw = object(value), decision = text(raw.decision, "Offer decision", 20).toUpperCase();
  if (!["ACCEPTED", "REJECTED", "COUNTERED"].includes(decision)) throw new Error("Offer decision is invalid.");
  return { ...versioned(raw), counterAmountCents: raw.counterAmountCents == null ? null : integer(raw.counterAmountCents, "Counter amount"), decision, offerVersion: integer(raw.offerVersion, "Offer version", 1) };
}

export function normalizeBelowReserveOfferApproval(value: unknown) {
  const raw = object(value), decision = text(raw.decision, "Decision", 20).toUpperCase();
  if (!["APPROVED", "REJECTED"].includes(decision)) throw new Error("Below-reserve approval decision is invalid.");
  return { ...versioned(raw), amountCents: integer(raw.amountCents, "Approved offer amount"), decision, offerVersion: integer(raw.offerVersion, "Offer version", 1), policyVersion: text(raw.policyVersion, "Policy version", 100) };
}

export function normalizeCompletion(value: unknown) {
  const raw = object(value), type = text(raw.type, "Completion type", 20).toUpperCase();
  if (!["SALE", "TRANSFER"].includes(type)) throw new Error("Completion type is invalid.");
  const gates = ["titleReady", "releaseReady", "custodyVerified", "transportVerified", "receiptVerified"] as const;
  const missing = gates.filter(gate => raw[gate] !== true);
  if (missing.length) throw new Error(`Completion gates are not satisfied: ${missing.join(", ")}.`);
  return { ...versioned(raw), buyerAcknowledgedDisclosures: raw.buyerAcknowledgedDisclosures === true, buyerAcknowledgmentReference: optional(raw.buyerAcknowledgmentReference, 1000), acceptedOfferVersion: raw.acceptedOfferVersion == null ? null : integer(raw.acceptedOfferVersion, "Accepted offer version", 1), buyerOrDestination: text(raw.buyerOrDestination, "Buyer or destination", 200), custodyVerified: true, paymentReference: text(raw.paymentReference, "Payment or transfer reference", 200), receiptVerified: true, releaseReady: true, titleReady: true, transportVerified: true, type };
}

export function normalizeSettlement(value: unknown) {
  const raw = object(value), expectedProceedsCents = integer(raw.expectedProceedsCents, "Expected proceeds"), actualProceedsCents = integer(raw.actualProceedsCents, "Actual proceeds"), feesCents = integer(raw.feesCents, "Actual fees"), creditsCents = integer(raw.creditsCents, "Credits"), toleranceCents = integer(raw.toleranceCents ?? 0, "Mismatch tolerance"), externalStatus = text(raw.externalStatus, "External status", 40).toUpperCase();
  if (externalStatus !== "ACKNOWLEDGED") throw new Error("Settlement cannot be completed without authoritative external acknowledgement.");
  const expectedNetCents = expectedProceedsCents - feesCents + creditsCents, varianceCents = actualProceedsCents - expectedNetCents;
  return { ...versioned(raw), actualProceedsCents, creditsCents, expectedNetCents, expectedProceedsCents, externalReference: text(raw.externalReference, "External reference", 200), externalStatus, feesCents, matched: Math.abs(varianceCents) <= toleranceCents, toleranceCents, varianceCents };
}

export function normalizeDispositionException(value: unknown) {
  const raw = object(value);
  return { ...versioned(raw), code: text(raw.code, "Exception code", 100).toUpperCase(), evidence: list(raw.evidence ?? [], "Exception evidence"), ownerUserId: text(raw.ownerUserId, "Exception owner", 100), severity: text(raw.severity, "Severity", 20).toUpperCase() };
}

export function calculateDispositionRecommendation(input: { ageDays: number; costExposureCents: number; blocked: boolean; titleReady: boolean }) {
  const reasonCodes: string[] = [];
  if (input.ageDays >= 60) reasonCodes.push("AGE_60_PLUS"); else if (input.ageDays >= 45) reasonCodes.push("AGE_45_PLUS");
  if (input.costExposureCents >= 3_000_000) reasonCodes.push("EXPOSURE_HIGH");
  if (input.blocked) reasonCodes.push("OPERATING_BLOCKED");
  if (!input.titleReady) reasonCodes.push("TITLE_READINESS_UNKNOWN");
  const eligible = reasonCodes.some(code => code !== "TITLE_READINESS_UNKNOWN");
  const score = Math.min(100, input.ageDays + Math.floor(input.costExposureCents / 100_000) + (input.blocked ? 20 : 0));
  const confidence = input.titleReady ? (reasonCodes.length >= 2 ? "HIGH" : "MEDIUM") : "LOW";
  const sourceFingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return { eligible, score, confidence, reasonCodes, sourceFingerprint, recommendation: eligible ? "REVIEW_DISPOSITION" : "RETAIN_AND_REVIEW_LATER", execution: "ADVISORY_NON_EXECUTING" };
}
