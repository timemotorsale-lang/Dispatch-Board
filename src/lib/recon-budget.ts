type CostEntry = { amountCents: number; category?: string | null; recoveredAt?: string | Date | null; status?: string | null };
type AcquisitionAppraisal = { estimatedReconCents?: number | null; estimatedRetailCents?: number | null };
type AcquisitionCaseLike = { appraisalSnapshot?: unknown; recommendationSnapshot?: unknown };
type EstimateLike = { totalCents?: number | null; authorizations?: Array<{ authorizedAmountCents?: number | null; disposition?: string | null }> | null };
type VendorWorkLike = { approvedAmountCents?: number | null; estimateAmountCents?: number | null; supplementalAmountCents?: number | null; status?: string | null };

export type ReconBudgetSummary = {
  committedSpendCents: number;
  estimatedReconBudgetCents: number | null;
  expectedRetailCents: number | null;
  remainingBudgetCents: number | null;
  source: "APPRAISAL" | "NONE" | "TAI";
  status: "CAUTION" | "NO_TAI" | "OVER_BUDGET" | "WITHIN_BUDGET";
};

function cents(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function formatMoneyCents(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

export function buildReconBudgetSummary(input: {
  acquisitionAppraisals?: AcquisitionAppraisal[] | null;
  acquisitionCase?: AcquisitionCaseLike | null;
  costEntries?: CostEntry[] | null;
  estimateVersions?: EstimateLike[] | null;
  vendorWorks?: VendorWorkLike[] | null;
}): ReconBudgetSummary | null {
  const caseAppraisal = record(input.acquisitionCase?.appraisalSnapshot);
  const latestAppraisal = input.acquisitionAppraisals?.[0] ?? null;
  const expectedRetailCents = cents(caseAppraisal.expectedRetailCents) ?? cents(latestAppraisal?.estimatedRetailCents);
  const estimatedReconBudgetCents = cents(caseAppraisal.estimatedReconCents) ?? cents(latestAppraisal?.estimatedReconCents);

  const estimate = input.estimateVersions?.[0] ?? null;
  const acceptedAuthorization = estimate?.authorizations?.find((item) => ["ACCEPTED", "PARTIAL"].includes(String(item.disposition ?? "")));
  const estimateSpend = cents(acceptedAuthorization?.authorizedAmountCents) ?? cents(estimate?.totalCents) ?? 0;
  const vendorSpend = (input.vendorWorks ?? []).reduce((sum, item) => sum + (cents(item.approvedAmountCents) ?? cents(item.estimateAmountCents) ?? 0) + Math.max(0, cents(item.supplementalAmountCents) ?? 0), 0);
  const postedReconSpend = (input.costEntries ?? []).filter((item) => String(item.category ?? "").toUpperCase() === "RECON" && !item.recoveredAt).reduce((sum, item) => sum + Math.max(0, cents(item.amountCents) ?? 0), 0);
  const committedSpendCents = Math.max(postedReconSpend, estimateSpend + vendorSpend);

  if (estimatedReconBudgetCents == null && expectedRetailCents == null && committedSpendCents === 0) return null;
  if (estimatedReconBudgetCents == null) return { committedSpendCents, estimatedReconBudgetCents: null, expectedRetailCents, remainingBudgetCents: null, source: "NONE", status: "NO_TAI" };

  const remainingBudgetCents = estimatedReconBudgetCents - committedSpendCents;
  const cautionThreshold = Math.round(estimatedReconBudgetCents * 0.15);
  return {
    committedSpendCents,
    estimatedReconBudgetCents,
    expectedRetailCents,
    remainingBudgetCents,
    source: input.acquisitionCase ? "TAI" : "APPRAISAL",
    status: remainingBudgetCents < 0 ? "OVER_BUDGET" : remainingBudgetCents <= cautionThreshold ? "CAUTION" : "WITHIN_BUDGET"
  };
}
