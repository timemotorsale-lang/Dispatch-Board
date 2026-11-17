/**
 * Repo notice letters (spec section 11), built with pdf-lib (already in the project).
 *
 * Until the owner pastes in attorney-approved wording (Settings -> Templates, Stage 10),
 * every letter carries a large "DRAFT – attorney-approved wording required" banner and
 * placeholder text. Release 1 never sends letters itself: a person prints and mails them,
 * then records how they were sent.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type LetterKey = "PRE_REPO_NOTICE" | "POST_REPO_NOTICE";

export const LETTER_TITLES: Record<LetterKey, string> = {
  PRE_REPO_NOTICE: "Notice before repossession",
  POST_REPO_NOTICE: "Notice after repossession"
};

const PLACEHOLDER: Record<LetterKey, string> = {
  PRE_REPO_NOTICE: "[PLACEHOLDER - NOT LEGAL WORDING] This space is for the pre-repossession notice your Minnesota attorney approves (for example any right-to-cure or default notice required by law). Do not mail this letter until approved wording has been added in Collections Settings.",
  POST_REPO_NOTICE: "[PLACEHOLDER - NOT LEGAL WORDING] This space is for the post-repossession notice your Minnesota attorney approves (for example notice of the vehicle's location, redemption rights, personal property, and any planned sale). Do not mail this letter until approved wording has been added in Collections Settings."
};

export type LetterFields = {
  dealershipName: string; dealershipPhone: string; dealershipAddress: string;
  customerName: string; mailingAddress: string | null;
  dealNumber: string | null; accountNumber: string; vehicle: string | null; vin: string | null;
  date: string; amountDue: string | null;
};

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/** Replace {fields} in approved wording. */
export function fillLetterText(body: string, fields: LetterFields) {
  return body.replace(/\{(\w+)\}/g, (_, key: string) => String((fields as Record<string, unknown>)[key] ?? `[${key}]`));
}

export async function buildLetterPdf(key: LetterKey, fields: LetterFields, approvedWording: string | null) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${LETTER_TITLES[key]} - ${fields.customerName}`);
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const draft = !approvedWording?.trim();
  let y = 740;
  const line = (text: string, options: { f?: PDFFont; size?: number; color?: [number, number, number] } = {}) => {
    const size = options.size ?? 11;
    for (const l of wrap(text, options.f ?? font, size, 492)) { page.drawText(l.replace(/[^\x20-\x7E]/g, "-"), { x: 60, y, size, font: options.f ?? font, color: rgb(...(options.color ?? [0, 0, 0])) }); y -= size + 4; }
  };
  if (draft) {
    page.drawRectangle({ x: 40, y: 690, width: 532, height: 70, color: rgb(1, 0.93, 0.93), borderColor: rgb(0.7, 0, 0), borderWidth: 2 });
    page.drawText("DRAFT - attorney-approved wording required", { x: 60, y: 735, size: 18, font: bold, color: rgb(0.7, 0, 0) });
    page.drawText("Do not mail. Add approved wording in Collections Settings first.", { x: 60, y: 710, size: 11, font, color: rgb(0.5, 0, 0) });
    page.drawText("DRAFT", { x: 150, y: 300, size: 140, font: bold, color: rgb(0.95, 0.85, 0.85), opacity: 0.6 });
    y = 670;
  }
  line(fields.dealershipName, { f: bold, size: 13 });
  if (fields.dealershipAddress) line(fields.dealershipAddress);
  if (fields.dealershipPhone) line(fields.dealershipPhone);
  y -= 14;
  line(fields.date);
  y -= 8;
  line(fields.customerName, { f: bold });
  line(fields.mailingAddress || "[mailing address not on file]");
  y -= 14;
  line(LETTER_TITLES[key], { f: bold, size: 14 });
  line(fields.dealNumber ? `Deal #${fields.dealNumber}` : `Account ${fields.accountNumber}`);
  if (fields.vehicle || fields.vin) line(`Vehicle: ${[fields.vehicle, fields.vin ? `VIN ${fields.vin}` : null].filter(Boolean).join(" - ")}`);
  y -= 10;
  line(draft ? PLACEHOLDER[key] : fillLetterText(approvedWording!, fields), { color: draft ? [0.45, 0.1, 0.1] : [0, 0, 0] });
  y -= 20;
  line(`Questions? Call ${fields.dealershipPhone || "[dealership phone]"}.`);
  line(fields.dealershipName);
  return { bytes: await pdf.save(), isDraftWording: draft };
}
