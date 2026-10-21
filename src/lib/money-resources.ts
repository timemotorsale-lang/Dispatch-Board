export const MONEY_KINDS = ["EXPENSE", "FUNDS_REQUEST", "ADVANCE_ISSUE", "ADVANCE_RETURN", "REFUND", "REIMBURSEMENT", "CARD_PAYMENT"] as const;
export const MONEY_CATEGORIES = ["Parts", "Fuel", "Repairs", "Transport", "Supplies", "Fees", "Other"] as const;
export const PAYMENT_METHODS = ["CASH", "CARD", "BANK", "PERSONAL"] as const;
export type MoneyKind = typeof MONEY_KINDS[number];
export class MoneyError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function text(value: unknown, max = 240) {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max) throw new MoneyError(`Use text of ${max} characters or fewer.`);
  return value.trim();
}
export function cents(value: unknown, allowZero = false) {
  const amount = text(value, 14);
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(amount)) throw new MoneyError("Enter a dollar amount with no more than two decimal places.");
  const [whole, fraction = ""] = amount.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 1_000_000_000 || result < (allowZero ? 0 : 1)) throw new MoneyError("Enter an amount within the supported range.");
  return result;
}
export function businessDate(value: unknown) {
  const date = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new MoneyError("Choose a valid transaction date.");
  return date;
}
export function moneyToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export function moneyLabel(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100); }
export type MoneyRow = { id: string; kind: string; amountCents: number; parentId?: string | null; approvalStatus: string; paymentMethod: string; receiptDocumentId?: string | null; receiptExplanation?: string | null };
export function advanceBalance(issued: number, children: MoneyRow[]) {
  const total = (kind: string) => children.filter(row => row.kind === kind && row.approvalStatus !== "SUPERSEDED").reduce((sum, row) => sum + row.amountCents, 0);
  return issued - total("EXPENSE") + total("REFUND") - children.filter(row => row.kind === "ADVANCE_RETURN" && row.approvalStatus === "APPROVED").reduce((sum, row) => sum + row.amountCents, 0);
}
export function cashExpected(opening: number, entries: MoneyRow[]) {
  return entries.filter(row => row.approvalStatus !== "SUPERSEDED").reduce((balance, row) => {
    if (row.kind === "ADVANCE_ISSUE") return balance - row.amountCents;
    if (row.kind === "ADVANCE_RETURN" && row.approvalStatus === "APPROVED") return balance + row.amountCents;
    if (row.kind === "EXPENSE" && !row.parentId) return balance - row.amountCents;
    if (row.kind === "REFUND" && !entries.find(original => original.id === row.parentId)?.parentId) return balance + row.amountCents;
    return balance;
  }, opening);
}
export function receiptPending(row: Pick<MoneyRow, "kind" | "receiptDocumentId" | "receiptExplanation"> & { approvalStatus?: string }) { return row.kind === "EXPENSE" && row.approvalStatus !== "SUPERSEDED" && !row.receiptDocumentId && !row.receiptExplanation; }
export function signedExpense(row: MoneyRow) { return row.approvalStatus === "SUPERSEDED" ? 0 : row.kind === "EXPENSE" ? row.amountCents : row.kind === "REFUND" ? -row.amountCents : 0; }
export function moneyFlags(row: MoneyRow & { accountId?: string | null; businessDate: string; merchant: string }, rows: Array<MoneyRow & { businessDate: string; merchant: string }>, limitCents?: number | null) {
  if (row.kind !== "EXPENSE" || row.approvalStatus === "SUPERSEDED") return [];
  return [
    receiptPending(row) ? "Receipt pending" : "",
    row.paymentMethod !== "PERSONAL" && !row.accountId ? "Funding source needs identification" : "",
    limitCents && row.amountCents > limitCents ? "Above purchase policy limit — manager review required" : "",
    row.merchant && rows.some(other => other.id !== row.id && other.kind === "EXPENSE" && other.approvalStatus !== "SUPERSEDED" && other.amountCents === row.amountCents && other.businessDate === row.businessDate && other.merchant.trim().toLowerCase() === row.merchant.trim().toLowerCase()) ? "Possible duplicate — compare receipt and reference" : ""
  ].filter(Boolean);
}
export function csvCell(value: unknown) { const raw = String(value ?? ""); return `"${(/^[\s]*[=+\-@]/.test(raw) && !/^-?\d+(\.\d+)?$/.test(raw) ? "'" : "") + raw.replaceAll('"', '""')}"`; }
export function parseCardCsv(raw: string) {
  if (raw.length > 1_000_000) throw new MoneyError("Import up to 1 MB at a time.");
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let index = 0; index < raw.length; index++) {
    const character = raw[index];
    if (character === '"') { if (quoted && raw[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted; }
    else if (!quoted && (character === "," || character === "\n")) { row.push(field); field = ""; if (character === "\n") { if (row.some(cell => cell.trim())) rows.push(row); row = []; } }
    else if (character !== "\r" || quoted) field += character;
  }
  if (quoted) throw new MoneyError("The CSV has an unclosed quoted field.");
  row.push(field); if (row.some(cell => cell.trim())) rows.push(row);
  const headers = rows.shift()?.map(cell => cell.trim().toLowerCase().replace(/^\uFEFF/, ""));
  if (!headers || ["transaction_id", "date", "merchant", "amount"].some(key => !headers.includes(key))) throw new MoneyError("CSV headers must include transaction_id,date,merchant,amount. Charges are positive; refunds are negative.");
  if (!rows.length || rows.length > 500) throw new MoneyError("Import between 1 and 500 posted transactions.");
  const seen = new Set<string>();
  return rows.map(cells => {
    if (cells.length !== headers.length) throw new MoneyError("A CSV row has the wrong number of columns.");
    const get = (key: string) => cells[headers.indexOf(key)]?.trim() ?? "";
    const externalId = text(get("transaction_id"), 150), merchant = text(get("merchant"), 200), amount = get("amount");
    if (!externalId || !merchant || seen.has(externalId)) throw new MoneyError("Each statement line needs a unique transaction ID and merchant.");
    seen.add(externalId);
    return { externalId, businessDate: businessDate(get("date")), merchant, amountCents: cents(amount.replace(/^-/, "")) * (amount.startsWith("-") ? -1 : 1) };
  });
}
