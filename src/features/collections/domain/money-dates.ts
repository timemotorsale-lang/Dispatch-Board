/** Money and date helpers. Money is always integer cents; dates are "YYYY-MM-DD" in America/Chicago. */

export const COLLECTIONS_TIME_ZONE = "America/Chicago";

/**
 * "$1,234.56" -> 123456, "(12.00)" -> -1200, "-5" -> -500, "" -> null.
 * Returns undefined when the text isn't a number (so callers can report an error).
 */
export function parseMoneyToCents(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : undefined;
  const text = String(value).trim();
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text) || text.startsWith("-");
  const cleaned = text.replace(/[()$,\s-]/g, "");
  if (!/^\d+(\.\d{1,4})?$|^\.\d{1,4}$/.test(cleaned)) return undefined;
  const [whole, fraction = ""] = cleaned.split(".");
  const cents = Number(whole || "0") * 100 + Math.round(Number(`0.${fraction || "0"}`) * 100);
  return negative ? -cents : cents;
}

export function formatCents(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** Whole number or null; undefined when it isn't a whole number. */
export function parseWholeNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isInteger(value) ? value : Number.isFinite(value) ? Math.round(value) : undefined;
  const text = String(value).trim().replace(/,/g, "");
  if (!text) return null;
  return /^-?\d+(\.0+)?$/.test(text) ? Number.parseInt(text, 10) : undefined;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function validYmd(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Accepts M/D/YYYY, M/D/YY, YYYY-MM-DD, a JS Date (from Excel) or an Excel serial number.
 * Returns "YYYY-MM-DD", null for empty, undefined for unreadable.
 */
export function parseBusinessDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    // Excel dates arrive as UTC midnight; keep the calendar day.
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  if (typeof value === "number") {
    if (value < 20000 || value > 80000) return undefined;
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    return parseBusinessDate(date);
  }
  const text = String(value).trim();
  if (!text) return null;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(text);
  if (match) {
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    return validYmd(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : undefined;
  }
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s.*)?$/.exec(text);
  if (match) {
    const m = Number(match[1]), d = Number(match[2]);
    let y = Number(match[3]);
    if (match[3].length === 2) y += y >= 70 ? 1900 : 2000;
    return validYmd(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : undefined;
  }
  return undefined;
}

/** Today's calendar date in America/Chicago, as "YYYY-MM-DD". */
export function chicagoToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLLECTIONS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "YYYY-MM-DD" -> Date at UTC midnight (the form Prisma uses for @db.Date). */
export function dateOnly(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function toYmd(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function addDays(ymd: string, days: number) {
  const date = dateOnly(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return toYmd(date)!;
}

export function daysBetween(fromYmd: string, toYmdValue: string) {
  return Math.round((dateOnly(toYmdValue).getTime() - dateOnly(fromYmd).getTime()) / 86_400_000);
}

/** Find a date in a file name such as "Active Accounts 11-15-2026.xlsx" or "accounts_2026-11-15.csv". */
export function dateFromFileName(fileName: string): string | null {
  const iso = /(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/.exec(fileName);
  if (iso && validYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]))) return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  const us = /(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})/.exec(fileName);
  if (us && validYmd(Number(us[3]), Number(us[1]), Number(us[2]))) return `${us[3]}-${pad(Number(us[1]))}-${pad(Number(us[2]))}`;
  return null;
}

/** Mask a phone for logs: "***-***-1234". */
export function maskPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : "***";
}

/** Normalize a US phone to E.164 (+1XXXXXXXXXX) or null. */
export function toE164(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
