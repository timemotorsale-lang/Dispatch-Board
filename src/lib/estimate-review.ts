export type ManualLaborReview = { engine: string; configuration: string; source: string; limitations: string; scope: string };
export const emptyManualLaborReview: ManualLaborReview = { engine: "", configuration: "", source: "", limitations: "", scope: "" };
export type ReviewLine = { key: string; description: string; type: string; quantity: number; unitPriceCents: number; laborGuideMinutes: number; laborLineKey?: string };
export function estimateReviewScope(vehicleId: string, lines: ReviewLine[]) {
  return JSON.stringify({ vehicleId, lines: lines.map(({ key, description, type, quantity, unitPriceCents, laborGuideMinutes, laborLineKey }) => ({ key, description, type, quantity, unitPriceCents, laborGuideMinutes, ...(laborLineKey ? { laborLineKey } : {}) })) });
}
export function manualReviewComplete(review: ManualLaborReview, scope: string) {
  return Boolean(review.engine.trim() && review.configuration.trim() && review.source.trim() && review.scope === scope);
}
export function validateManualReview(value: unknown): ManualLaborReview {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Manual labor review is required.");
  const row = value as Record<string, unknown>;
  for (const key of ["engine", "configuration", "source", "limitations", "scope"]) {
    if (typeof row[key] !== "string" || row[key].length > (key === "scope" ? 150000 : 2000)) throw new Error("Invalid manual labor review.");
  }
  return row as ManualLaborReview;
}
