/**
 * The numbers people actually use to find an account: deal number, stock number and the
 * last 6 of the VIN. DealerCenter's internal account ID is a long code nobody reads, so it
 * is only shown in "Flags and details" for reference.
 */
export function accountRefs(a: { dealNumber?: string | null; stockNumberRaw?: string | null; vin?: string | null }) {
  const parts: string[] = [];
  if (a.dealNumber) parts.push(`Deal #${a.dealNumber}`);
  if (a.stockNumberRaw) parts.push(`Stock #${a.stockNumberRaw}`);
  const vin = a.vin?.replace(/\s/g, "");
  if (vin && vin.length >= 6) parts.push(`VIN …${vin.slice(-6).toUpperCase()}`);
  return parts.join(" · ");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-08-23" → "Aug 23, 2025". Anything that isn't a plain date is returned as is. */
export function formatDay(ymd: string | null | undefined) {
  if (!ymd) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** "+16125551234" → "(612) 555-1234". Numbers that aren't US 10-digit are shown as stored. */
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return phone;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
