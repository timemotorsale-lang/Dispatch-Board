import { chicagoDate } from "./deal-dashboard";

export const DEAL_WORK_VIEWS = { ALL: "All current work", attention: "Needs attention", overdue: "Overdue deal follow-ups", unattended: "No scheduled follow-up", aging: "Aging paperwork · 3+ days", returns: "Vehicle returns due", working: "Working", paperwork: "Sold · paperwork pending", ready: "Ready to finalize", funding: "Awaiting funding", completed: "Completed in selected period" } as const;
export type DealTaskLink = { version: 1; organizationId: string; draftId: string | null; jacketId: string | null };
export const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function taskDealLink(snapshot: unknown): DealTaskLink | null {
  const link = record(record(snapshot).dealDashboard);
  return link.version === 1 && typeof link.organizationId === "string" && (typeof link.draftId === "string" || typeof link.jacketId === "string") ? link as DealTaskLink : null;
}
export function dealAgeDays(value: string | null, now = new Date()) {
  const today = chicagoDate(now);
  return value && today ? Math.max(0, Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${value}T12:00:00Z`)) / 86400000)) : 0;
}
export function dealDocumentHref(jacketId: string, requirementId?: string) {
  return `/sales-documents?${new URLSearchParams({ jacketId, ...(requirementId ? { requirementId } : {}) })}${requirementId ? "#deal-document-action" : ""}`;
}
export const FINANCIAL_KINDS = { AGREED_AMOUNT: "Agreed amount", PAYMENT: "Verified payment", REFUND: "Verified refund", REVERSAL: "Verified reversal" } as const;
export type DealFinancialKind = keyof typeof FINANCIAL_KINDS;
export type DealFinancialEntry = { id: string; kind: DealFinancialKind; amountCents: number; businessDate: string; reference: string; evidence: string; reason: string; originalId: string | null; actorName: string; recordedAt: string };
export function financialEntry(id: string, value: unknown, recordedAt: string): DealFinancialEntry | null {
  const entry = record(value);
  if (!Object.hasOwn(FINANCIAL_KINDS, String(entry.kind)) || !Number.isSafeInteger(entry.amountCents) || Number(entry.amountCents) < (entry.kind === "AGREED_AMOUNT" ? 0 : 1) || !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.businessDate))) return null;
  return { ...entry, id, recordedAt } as DealFinancialEntry;
}
export function summarizeDealFinancials(entries: DealFinancialEntry[], range?: { start: string; end: string }) {
  const sorted = [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id));
  const reversed = new Set(sorted.filter(entry => entry.kind === "REVERSAL").map(entry => entry.originalId));
  const payments = sorted.filter(entry => entry.kind === "PAYMENT" && !reversed.has(entry.id));
  const refunds = sorted.filter(entry => entry.kind === "REFUND" && !reversed.has(entry.id));
  const agreed = sorted.filter(entry => entry.kind === "AGREED_AMOUNT").at(-1)?.amountCents ?? null;
  const sum = (rows: DealFinancialEntry[]) => rows.reduce((total, row) => total + row.amountCents, 0);
  const collectedCents = sum(payments), refundedCents = sum(refunds), netCents = collectedCents - refundedCents;
  const activity = range ? sorted.filter(entry => entry.businessDate >= range.start && entry.businessDate <= range.end) : sorted;
  const lookup = new Map(sorted.map(entry => [entry.id, entry]));
  const periodNetCents = activity.reduce((total, entry) => total + (entry.kind === "PAYMENT" ? entry.amountCents : entry.kind === "REFUND" ? -entry.amountCents : entry.kind === "REVERSAL" ? lookup.get(entry.originalId || "")?.kind === "PAYMENT" ? -entry.amountCents : entry.amountCents : 0), 0);
  return { agreedCents: agreed, collectedCents, refundedCents, netCents, outstandingCents: agreed === null ? null : Math.max(0, agreed - netCents), creditCents: agreed === null ? 0 : Math.max(0, netCents - agreed), periodPaymentsCents: sum(activity.filter(entry => entry.kind === "PAYMENT")), periodRefundsCents: sum(activity.filter(entry => entry.kind === "REFUND")), periodReversalsCents: sum(activity.filter(entry => entry.kind === "REVERSAL")), periodNetCents, entryCount: entries.length };
}
export function financialEntryError(entries: DealFinancialEntry[], proposed: Pick<DealFinancialEntry, "kind" | "amountCents" | "originalId">): string | null {
  if (!Object.hasOwn(FINANCIAL_KINDS, proposed.kind) || !Number.isSafeInteger(proposed.amountCents) || proposed.amountCents < (proposed.kind === "AGREED_AMOUNT" ? 0 : 1) || proposed.amountCents > 1000000000) return "Enter a positive amount up to $10,000,000.00. Only an agreed obligation may be zero.";
  if (proposed.kind === "AGREED_AMOUNT" || proposed.kind === "PAYMENT") return proposed.originalId ? "This entry does not take an original transaction." : null;
  const original = entries.find(entry => entry.id === proposed.originalId);
  if (!original || !["PAYMENT", "REFUND"].includes(original.kind)) return "Choose an original payment or refund from this same deal.";
  if (entries.some(entry => entry.kind === "REVERSAL" && entry.originalId === original.id)) return "That transaction has already been reversed.";
  const reversed = new Set(entries.filter(entry => entry.kind === "REVERSAL").map(entry => entry.originalId));
  const refunds = entries.filter(entry => entry.kind === "REFUND" && entry.originalId === original.id && !reversed.has(entry.id));
  if (proposed.kind === "REFUND") return original.kind !== "PAYMENT" ? "A refund must reference an original payment." : proposed.amountCents > original.amountCents - refunds.reduce((sum, entry) => sum + entry.amountCents, 0) ? "The refund exceeds the original payment's remaining refundable amount." : null;
  return proposed.amountCents !== original.amountCents ? "A reversal must match the full original amount." : original.kind === "PAYMENT" && refunds.length ? "Reverse its recorded refunds before reversing this payment." : null;
}
export type DealMilestone = { state: "VERIFIED" | "NOT_REQUIRED" | "PENDING"; reference: string; reason: string; actorName: string; at: string };
export type DealWorkIndicators = { canEdit: boolean; ageDays: number; soldAgeDays: number; unattended: boolean; overdue: boolean; returnDueAt: string | null; alerts: string[]; funding: DealMilestone | null; delivery: DealMilestone | null; financials: ReturnType<typeof summarizeDealFinancials> | null };
