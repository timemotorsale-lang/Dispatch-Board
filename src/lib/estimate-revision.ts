export type RevisableEstimateLine = { key: string; type: "LABOR" | "PART" | "FEE"; description: string; quantity: number; unitPriceCents: number; taxable: boolean; workTypeCode: string; laborGuideMinutes: number; plannedCorrection: string };
export type RevisableEstimate = {
  id: string; version: number; lineItems: RevisableEstimateLine[];
  taxCents?: number; discountCents?: number; taxBoundary?: string; presentationChannel?: string;
  assumptions?: string | null; optionGroups?: unknown;
};

// Copy commercial scope and historical notes, never authorization or structured review approval.
export function copyEstimateForRevision(source: RevisableEstimate) {
  return {
    lineItems: source.lineItems.map(line => ({ ...line })),
    taxCents: source.taxCents ?? 0,
    discountCents: source.discountCents ?? 0,
    taxBoundary: source.taxBoundary ?? "Review applicable tax treatment",
    presentationChannel: source.presentationChannel ?? "IN_PERSON",
    assumptions: source.assumptions ?? null,
    optionGroups: source.optionGroups == null ? null : JSON.parse(JSON.stringify(source.optionGroups)),
  };
}
