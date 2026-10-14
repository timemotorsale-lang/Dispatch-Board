import { summarizeRecordedCosts } from "./cost-domain";

export function normalizePricing(value: unknown) {
  const body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const integer = (key: string, min: number, max = 2_000_000_000) => {
    if (!Number.isSafeInteger(body[key]) || Number(body[key]) < min || Number(body[key]) > max) throw new Error(`Valid ${key} is required.`);
    return Number(body[key]);
  };
  const string = (key: string, min: number, max: number) => {
    const value = body[key];
    if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new Error(`Valid ${key} is required.`);
    return value.trim();
  };
  if (typeof body.packEnabled !== "boolean" || typeof body.includeEstimates !== "boolean") throw new Error("Explicit pack and estimate choices are required.");
  if (!["OFF", "AMOUNT", "PERCENT"].includes(String(body.marginMode))) throw new Error("Margin mode is invalid.");
  const packCents = integer("packCents", 0);
  if (!body.packEnabled && packCents !== 0) throw new Error("Disabled pack must be zero.");
  const marginMode = body.marginMode as "OFF" | "AMOUNT" | "PERCENT";
  if (marginMode === "OFF" && body.threshold != null) throw new Error("Disabled enforcement must not carry a threshold.");
  return { priceCents: integer("priceCents", 1), packEnabled: body.packEnabled, packCents, includeEstimates: body.includeEstimates, marginMode, threshold: marginMode === "OFF" ? null : integer("threshold", 0, marginMode === "PERCENT" ? 10000 : 2_000_000_000), expectedVersion: integer("expectedVersion", 1), idempotencyKey: string("idempotencyKey", 1, 200), reason: string("reason", 10, 1000) };
}

export function comparePricing(costs: readonly { id?: string; category: string; status: string; currency: string; amountCents: number }[], proposal: { priceCents: number; packCents: number; includeEstimates: boolean; marginMode: string; threshold: number | null }) {
  const summary = summarizeRecordedCosts(costs);
  const known = summary.unclassified === 0 && costs.some(cost => cost.category === "ACQUISITION" && cost.status === "INCURRED" && cost.currency === "USD");
  const basisCents = summary.incurredCents + (proposal.includeEstimates ? summary.estimatedCents : 0) + proposal.packCents;
  const comparable = known && basisCents >= 0;
  const marginCents = comparable ? proposal.priceCents - basisCents : null;
  const meetsThreshold = proposal.marginMode === "OFF" ? null : marginCents === null ? false : proposal.marginMode === "AMOUNT" ? marginCents >= Number(proposal.threshold) : marginCents * 10000 >= proposal.priceCents * Number(proposal.threshold);
  return { ...summary, basisCents: comparable ? basisCents : null, marginCents, marginPercent: marginCents === null ? null : marginCents * 100 / proposal.priceCents, meetsThreshold, known: comparable, costIds: costs.filter(cost => ["INCURRED", "ESTIMATED"].includes(cost.status)).map(cost => cost.id).filter(Boolean) };
}
