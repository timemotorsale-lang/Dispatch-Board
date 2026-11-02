export class VendorBillingError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const billingMoney = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function billingCents(value: unknown, allowZero = false): number {
  if (typeof value !== "string" || !/^\$?\d+(?:,\d{3})*(?:\.\d{1,2})?$/.test(value.trim())) throw new VendorBillingError("Enter a money amount with at most two decimal places.");
  const [whole, fraction = ""] = value.trim().replace(/[$,]/g, "").split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 1000000000 || amount < (allowZero ? 0 : 1)) throw new VendorBillingError("Enter an amount greater than zero and no more than $10,000,000.");
  return amount;
}
export function billingText(value: unknown, label: string, max = 300, optional = false) {
  const text = typeof value === "string" ? value.trim() : "";
  if ((!optional && !text) || text.length > max) throw new VendorBillingError(`${label} is required and must be no longer than ${max} characters.`);
  return text;
}
export function billingDate(value: unknown) {
  const text = billingText(value, "Date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text) throw new VendorBillingError("Enter a valid date.");
  return text;
}
export function billingDirection(value: unknown): "RECEIVABLE" | "PAYABLE" {
  if (value !== "RECEIVABLE" && value !== "PAYABLE") throw new VendorBillingError("Choose They owe us or We owe them.");
  return value;
}
export const chicagoDate = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
export function monthlyDate(start: string, offset: number) {
  billingDate(start);
  const [year, month, day] = start.split("-").map(Number), first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, last))).toISOString().slice(0, 10);
}
export function repaymentSchedule(start: string, principal: number, installment: number) {
  const count = Math.ceil(principal / installment);
  if (!Number.isSafeInteger(count) || count > 600 || principal < 1 || installment < 1) throw new VendorBillingError("Repayment schedules must end within 600 monthly installments.");
  return Array.from({ length: count }, (_, index) => ({ dueDate: monthlyDate(start, index), amountCents: Math.min(installment, principal - index * installment), periodKey: `installment-${index + 1}` }));
}
export type BillingRow = { id: string; direction: string; kind: string; status: string; number: string; title: string; issueDate: string; dueDate: string; amountCents: number; taxCents: number; version: number; balanceCents: number; appliedCents: number; sourceReference: string; disputeReason: string; agreementId: string | null; lines: Array<{ id: string; description: string; amountCents: number; workJobId: string | null }>; dueItems: Array<{ dueDate: string; amountCents: number; outstandingCents: number }> };
export function dueBalances(items: Array<{ dueDate: string; amountCents: number }>, applied: number) {
  let remaining = applied;
  return [...items].sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map(item => { const covered = Math.min(item.amountCents, Math.max(remaining,0)); remaining -= covered; return { ...item, outstandingCents: item.amountCents - covered }; });
}
export function billingPeriod(key: string, today = chicagoDate()): [string, string] {
  const day = new Date(today + "T12:00:00Z"), shift = (date: Date, days: number) => { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next.toISOString().slice(0,10); };
  const week = shift(day, -((day.getUTCDay() + 6) % 7));
  if (key === "TODAY") return [today, shift(day, 1)];
  if (key === "YESTERDAY") return [shift(day,-1), today];
  if (key === "THIS_WEEK") return [week,shift(new Date(week),7)];
  if (key === "LAST_WEEK") return [shift(new Date(week),-7),week];
  if (key === "TWO_WEEKS_AGO") return [shift(new Date(week),-14),shift(new Date(week),-7)];
  const first = today.slice(0,7) + "-01";
  if (key === "THIS_MONTH") return [first,monthlyDate(first,1)];
  if (key === "LAST_MONTH") return [monthlyDate(first,-1),first];
  return ["0001-01-01","9999-12-31"];
}
export function normalizeBillingLines(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new VendorBillingError("Add between 1 and 100 invoice lines.");
  const lines = value.map(raw => { if (!raw || typeof raw !== "object") throw new VendorBillingError("Check the invoice lines."); return { description: billingText(raw.description,"Line description",500), amountCents: billingCents(raw.amount), workJobId: billingText(raw.workJobId,"Work ticket",150,true) || null }; });
  const sum = lines.reduce((total,line) => total + line.amountCents,0);
  if (sum > 1000000000) throw new VendorBillingError("The invoice exceeds the supported amount.");
  return lines;
}
