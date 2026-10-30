import { calculateBodyDraft, normalizeBodyDraft, type BodyDraft } from "./domain";

export type CollisionCandidate = { reference: string; description: string; source: string; sourceVersion: string; priceCents: number | null; fitment: "UNVERIFIED" | "REVIEW_REQUIRED" };
export type CollisionProvider = { id: string; lookup: (query: { vehicleId: string; componentId: string }) => Promise<CollisionCandidate[]> };
export async function collisionCandidates(provider: CollisionProvider | null, query: { vehicleId: string; componentId: string }) {
  if (!provider) return { status: "UNCONFIGURED" as const, candidates: [], message: "No licensed supplier is configured. Enter a reviewed quote manually or use existing parts tools." };
  try {
    const candidates = await provider.lookup(query);
    if (candidates.some(candidate => !candidate.reference || !candidate.description || !candidate.source || !candidate.sourceVersion || !["UNVERIFIED", "REVIEW_REQUIRED"].includes(candidate.fitment) || (candidate.priceCents !== null && (!Number.isSafeInteger(candidate.priceCents) || candidate.priceCents < 0)))) throw new Error("Invalid supplier response");
    return { status: "REVIEW_REQUIRED" as const, candidates, message: "Supplier candidates require staff fitment, price and scope review. No order has been placed." };
  } catch {
    return { status: "UNAVAILABLE" as const, candidates: [], message: "The supplier is unavailable. Manual quotes, saved drafts and existing parts tools remain available." };
  }
}
export function collisionExport(content: BodyDraft, reference: { id: string; version: number; estimateId: string | null }) {
  const draft = normalizeBodyDraft(content);
  return { format: "TIME_MOTOR_COLLISION_REVIEW", schema: 1, reference, draft, calculation: calculateBodyDraft(draft), notice: "Internal review interchange only. Not an insurer submission, licensed provider format, repair authorization, purchase order or invoice." };
}
