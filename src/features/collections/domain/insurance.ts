/**
 * Insurance helpers (spec section 9).
 *
 * parseInsuranceText() turns OCR text from an insurance card or declarations page into
 * *suggested* field values. It never saves anything: the person checks every field and
 * presses Save. When it isn't sure, it leaves the field empty.
 */

export type InsurancePrefill = {
  carrier: string | null;
  policyNumber: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  lienholderListed: boolean | null;
  confidence: "LOW" | "MEDIUM";
  notes: string[];
};

const CARRIERS = [
  "State Farm", "Progressive", "GEICO", "Allstate", "Farmers", "Liberty Mutual", "American Family", "Nationwide", "USAA", "Travelers",
  "Dairyland", "The General", "Bristol West", "Kemper", "Auto-Owners", "Westfield", "Safeco", "Esurance", "Root", "Direct Auto",
  "Mercury", "Hallmark", "National General", "North Star Mutual", "Western National", "Badger Mutual", "Infinity", "Assurance America"
];

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

function ymd(y: number, m: number, d: number) {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Every date found in the text, in order: 11/16/2026, 11-16-26, 2026-11-16, Nov 16, 2026. */
export function findDates(text: string) {
  const found: Array<{ index: number; value: string }> = [];
  for (const m of text.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g)) {
    const v = ymd(Number(m[3]), Number(m[1]), Number(m[2])); if (v) found.push({ index: m.index!, value: v });
  }
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const v = ymd(Number(m[1]), Number(m[2]), Number(m[3])); if (v) found.push({ index: m.index!, value: v });
  }
  for (const m of text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi)) {
    const v = ymd(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2])); if (v) found.push({ index: m.index!, value: v });
  }
  return found.sort((a, b) => a.index - b.index);
}

function dateAfterLabel(text: string, labels: RegExp, dates: Array<{ index: number; value: string }>) {
  const label = labels.exec(text);
  if (!label) return null;
  return dates.find(d => d.index >= label.index && d.index - label.index < 80)?.value ?? null;
}

export function parseInsuranceText(text: string, dealershipName: string): InsurancePrefill {
  const notes: string[] = [];
  const clean = text.replace(/\r/g, "");
  const carrier = CARRIERS.find(c => new RegExp(`\\b${c.replace(/[-]/g, "[- ]?")}\\b`, "i").test(clean)) ?? null;
  const policy = /\bpolicy\s*(?:no\.?|number|num|#)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,24})/i.exec(clean);
  const dates = findDates(clean);
  let effectiveDate = dateAfterLabel(clean, /\b(effective|eff\.?|from|start)\b/i, dates);
  let expirationDate = dateAfterLabel(clean, /\b(expiration|expires|exp\.?|to|until|end)\b/i, dates);
  if (!effectiveDate && !expirationDate && dates.length >= 2) {
    effectiveDate = dates[0].value; expirationDate = dates[dates.length - 1].value;
    notes.push("Dates were guessed from their order on the card. Check them.");
  }
  if (effectiveDate && expirationDate && expirationDate <= effectiveDate) { notes.push("The dates look reversed. Check them."); }
  // Ignore punctuation and company suffixes, so "Time Motor Sales, Inc." matches "TIME MOTOR SALES" on a card.
  const nameWords = dealershipName.replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !/^(inc|llc|corp|ltd)$/i.test(w));
  const mentionsDealer = nameWords.length > 0 && nameWords.every(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(clean));
  const mentionsLien = /\b(lien\s*holder|lienholder|loss\s*payee|additional\s*interest)\b/i.test(clean);
  const lienholderListed = mentionsDealer ? true : null;
  if (mentionsLien && !mentionsDealer) notes.push("A lienholder is mentioned, but not your dealership's name. Check who is listed.");
  if (!carrier) notes.push("Carrier not recognized.");
  const filled = [carrier, policy, effectiveDate, expirationDate].filter(Boolean).length;
  return { carrier, policyNumber: policy ? policy[1].toUpperCase() : null, effectiveDate, expirationDate, lienholderListed, confidence: filled >= 3 ? "MEDIUM" : "LOW", notes };
}
