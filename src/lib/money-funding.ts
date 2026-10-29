import { MoneyError, text } from "./money-resources";
import { savedPurchasingFlags } from "./money-purchasing";

export const UNIDENTIFIED_CARD_FLAG = "Company card not identified — independent manager review required";
export type FundingException = { type: "UNIDENTIFIED_COMPANY_CARD"; alreadyPaid: true; note: string };
export function cardFundingException(method: string, accountId: string | null, input: Record<string, unknown>): FundingException | null {
  if (method !== "CARD" || accountId) return null;
  const note = text(input.fundingNote, 500);
  if (/(?:\d[ -]?){12,19}/.test(note)) throw new MoneyError("Do not enter a full card number. Describe who paid or provide only the last four digits.");
  return { type: "UNIDENTIFIED_COMPANY_CARD", alreadyPaid: true, note: note || "Company card is not listed for this staff account." };
}
export function readFundingException(snapshot: unknown): FundingException | null {
  if (!snapshot || typeof snapshot !== "object" || !("fundingException" in snapshot)) return null;
  const value = snapshot.fundingException;
  if (!value || typeof value !== "object" || !("type" in value) || value.type !== "UNIDENTIFIED_COMPANY_CARD" || !("alreadyPaid" in value) || value.alreadyPaid !== true || !("note" in value) || typeof value.note !== "string") return null;
  return { type: "UNIDENTIFIED_COMPANY_CARD", alreadyPaid: true, note: value.note };
}
export function fundingSnapshot(purchasing: unknown, exception: FundingException | null) {
  const source = purchasing && typeof purchasing === "object" && !Array.isArray(purchasing) ? purchasing : {};
  if (!exception) return source;
  return { ...source, fundingException: exception, flags: [...new Set([...savedPurchasingFlags(source), UNIDENTIFIED_CARD_FLAG])] };
}
