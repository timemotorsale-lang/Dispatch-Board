/**
 * Builds the import preview from parsed rows and what's already in the database.
 * Pure function: the server loads the data, this decides new/updated/unchanged/needs review.
 */
import { bucketFor, type Bucket } from "../domain/status";
import type { ParsedRow } from "./parse";

export type ImportRecord = {
  rowNumber: number;
  externalAccountId: string;
  contractDate: string | null;
  dealNumber: string | null;
  buyerName: string;
  vehicleDescription: string | null;
  stockNumber: string | null;
  dmsRepoStatus: string | null;
  dmsAccountStatus: string | null;
  dmsInsuranceStatus: string | null;
  dmsAutopayStatus: string | null;
  dmsCollectorName: string | null;
  dmsLenderType: string | null;
  downCents: number;
  principalCents: number;
  interestCents: number;
  otherCents: number;
  lateCents: number;
  sideNoteCents: number;
  creditCents: number;
  totalBalanceCents: number;
  paymentDueDate: string | null;
  promiseDate: string | null;
  daysPastDue: number;
  paymentAmountCents: number | null;
  amountDueCents: number;
  paymentsRemaining: number | null;
  bucket: Bucket;
};

export type ExistingAccount = {
  id: string;
  externalAccountId: string;
  customerId: string | null;
  vehicleId: string | null;
  closed: boolean;
  latest: Pick<ImportRecord, "totalBalanceCents" | "amountDueCents" | "daysPastDue" | "paymentDueDate" | "dmsRepoStatus" | "dmsAccountStatus" | "lateCents" | "paymentsRemaining" | "promiseDate"> | null;
};

export type RowMatch = { vehicleId: string | null; suggestedCustomerId: string | null; suggestionSource: "VEHICLE" | "NAME" | null };

export type PreviewChange = "NEW" | "UPDATED" | "UNCHANGED";
export type PreviewRow = ImportRecord & {
  change: PreviewChange;
  accountId: string | null;
  needsReview: boolean;
  reviewReasons: string[];
  match: RowMatch;
  changedFields: string[];
};

export type PreviewSummary = {
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
  needsReview: number;
  errors: number;
  missing: number;
  totalBalanceCents: number;
  bucketCounts: Record<Bucket, number>;
};

function num(value: unknown) {
  return typeof value === "number" ? value : 0;
}
function textOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

export function toImportRecord(row: ParsedRow, graceDays: number): ImportRecord {
  const v = row.values;
  const daysPastDue = Math.max(0, num(v.daysPastDue));
  return {
    rowNumber: row.rowNumber,
    externalAccountId: String(v.externalAccountId),
    contractDate: textOrNull(v.contractDate),
    dealNumber: textOrNull(v.dealNumber),
    buyerName: String(v.buyerName ?? ""),
    vehicleDescription: textOrNull(v.vehicleDescription),
    stockNumber: textOrNull(v.stockNumber),
    dmsRepoStatus: textOrNull(v.dmsRepoStatus),
    dmsAccountStatus: textOrNull(v.dmsAccountStatus),
    dmsInsuranceStatus: textOrNull(v.dmsInsuranceStatus),
    dmsAutopayStatus: textOrNull(v.dmsAutopayStatus),
    dmsCollectorName: textOrNull(v.dmsCollectorName),
    // LenderType is stored for reference only; it never sets the account type.
    dmsLenderType: textOrNull(v.dmsLenderType),
    downCents: num(v.downCents),
    principalCents: num(v.principalCents),
    interestCents: num(v.interestCents),
    otherCents: num(v.otherCents),
    lateCents: num(v.lateCents),
    sideNoteCents: num(v.sideNoteCents),
    creditCents: num(v.creditCents),
    totalBalanceCents: num(v.totalBalanceCents),
    paymentDueDate: textOrNull(v.paymentDueDate),
    promiseDate: textOrNull(v.promiseDate),
    daysPastDue,
    paymentAmountCents: typeof v.paymentAmountCents === "number" ? v.paymentAmountCents : null,
    amountDueCents: num(v.amountDueCents),
    paymentsRemaining: typeof v.paymentsRemaining === "number" ? v.paymentsRemaining : null,
    bucket: bucketFor(daysPastDue, graceDays)
  };
}

const COMPARED_FIELDS = ["totalBalanceCents", "amountDueCents", "daysPastDue", "paymentDueDate", "dmsRepoStatus", "dmsAccountStatus", "lateCents", "paymentsRemaining", "promiseDate"] as const;

export function buildPreview(input: {
  records: ImportRecord[];
  existing: ExistingAccount[];
  matches: Map<string, RowMatch>;
  errorCount: number;
}): { rows: PreviewRow[]; missing: ExistingAccount[]; summary: PreviewSummary } {
  const byExternal = new Map(input.existing.map(account => [account.externalAccountId, account]));
  const inFile = new Set(input.records.map(record => record.externalAccountId));
  const bucketCounts: Record<Bucket, number> = { CURRENT: 0, GRACE_1_5: 0, LATE_6_14: 0, D15_30: 0, D31_60: 0, D61_PLUS: 0 };
  const rows = input.records.map((record): PreviewRow => {
    bucketCounts[record.bucket] += 1;
    const existing = byExternal.get(record.externalAccountId);
    const match = input.matches.get(record.externalAccountId) ?? { vehicleId: null, suggestedCustomerId: null, suggestionSource: null };
    const changedFields = existing?.latest
      ? COMPARED_FIELDS.filter(field => (existing.latest![field] ?? null) !== (record[field] ?? null))
      : [];
    const change: PreviewChange = !existing ? "NEW" : !existing.latest || changedFields.length ? "UPDATED" : "UNCHANGED";
    const vehicleId = existing?.vehicleId ?? match.vehicleId;
    const customerId = existing?.customerId ?? null;
    const reviewReasons = [
      ...(!vehicleId ? [record.stockNumber ? `No vehicle found with stock number ${record.stockNumber}.` : "No stock number in the file."] : []),
      ...(!customerId ? [match.suggestedCustomerId ? "Customer suggested; confirm the link on the account page." : "No customer match yet; link the customer on the account page."] : [])
    ];
    return { ...record, change, accountId: existing?.id ?? null, needsReview: reviewReasons.length > 0, reviewReasons, match, changedFields };
  });
  const missing = input.existing.filter(account => !account.closed && !inFile.has(account.externalAccountId));
  const summary: PreviewSummary = {
    totalRows: rows.length,
    created: rows.filter(row => row.change === "NEW").length,
    updated: rows.filter(row => row.change === "UPDATED").length,
    unchanged: rows.filter(row => row.change === "UNCHANGED").length,
    needsReview: rows.filter(row => row.needsReview).length,
    errors: input.errorCount,
    missing: missing.length,
    totalBalanceCents: rows.reduce((sum, row) => sum + row.totalBalanceCents, 0),
    bucketCounts
  };
  return { rows, missing, summary };
}

/** Compare names like "Last, First" and "First Last" without caring about order or case. */
export function nameKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s,]/g, " ").replace(/,/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}
