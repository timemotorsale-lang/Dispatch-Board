import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { dealDeskLogoHtml, drawDealDeskPdfLogo } from "./deal-desk-document-brand";

type SummarySection = { heading: string; rows?: Array<[string, string]>; paragraphs?: string[] };
export type LeaseSummary = {
  identity: Array<[string, string]>;
  highlights: Array<[string, string]>;
  signing: SummarySection;
  payments: SummarySection;
  sections: SummarySection[];
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function leaseSummaryHtml(summary: LeaseSummary) {
  const rows = (items: Array<[string, string]>) => items.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
  const section = (item: SummarySection) => `<section><h2>${escapeHtml(item.heading)}</h2>${item.rows ? `<table>${rows(item.rows)}</table>` : ""}${(item.paragraphs ?? []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Lease Summary</title><style>
    * { box-sizing: border-box; } @page { size: letter; margin: .45in; }
    body { color: #20252b; font: 11px Arial, sans-serif; max-width: 760px; margin: 24px auto; padding: 0 12px; }
    header { border-bottom: 1px solid #bac3cc; padding-bottom: 8px; } header strong { font-size: 16px; } header p { margin: 4px 0; }
    h1 { font-size: 24px; margin: 14px 0 8px; } h2 { font-size: 13px; margin: 10px 0 6px; }
    .identity { margin-bottom: 12px; } .identity div { padding: 3px 0; overflow-wrap: anywhere; }
    .highlights { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; border-block: 1px solid #bac3cc; padding: 12px 0; }
    .highlights span { display: block; font-size: 10px; margin-bottom: 5px; } .highlights strong { font-size: 17px; overflow-wrap: anywhere; }
    .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
    table { border-collapse: collapse; width: 100%; } th, td { padding: 5px 0; border-bottom: 1px solid #e0e4e8; } th { text-align: left; font-weight: normal; } td { text-align: right; white-space: nowrap; }
    p { margin: 5px 0; line-height: 1.4; } section { break-inside: avoid; }
    .signatures { display: grid; grid-template-columns: 3fr 1fr; gap: 20px; margin-top: 24px; } .signatures div { border-top: 1px solid #20252b; padding-top: 5px; }
    footer { margin-top: 12px; font-size: 9px; } @media print { body { margin: 0; padding: 0; } }
    @media screen and (max-width: 550px) { .highlights, .columns { grid-template-columns: 1fr 1fr; } .columns { display: block; } }
  </style></head><body><header>${dealDeskLogoHtml(true)}<strong>Time Motor Sales, Inc.</strong><p>1101 E. Lake Street, Minneapolis, MN 55407 | 612-724-3631</p><p>timemotors.net | timemotorsale@gmail.com</p></header>
  <h1>Lease Summary</h1><div class="identity">${summary.identity.map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`).join("")}</div>
  <div class="highlights">${summary.highlights.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>
  <div class="columns">${section(summary.signing)}${section(summary.payments)}</div>${summary.sections.map(section).join("")}
  <p>I received and reviewed this lease summary.</p><div class="signatures"><div>Lessee / co-lessee signature(s)</div><div>Date</div></div>
  <footer>The signed lease and addenda control if there is a difference. Purchase-option taxes and fees, late charges, damage, and other contingent charges are not included in the estimated lease total.</footer></body></html>`;
}

export async function leaseSummaryPdfBase64(summary: LeaseSummary) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  await drawDealDeskPdfLogo(pdf, page);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.12, .15, .18);
  const rule = rgb(.73, .77, .81);
  function draw(value: string, x: number, y: number, size = 9, isBold = false) {
    page.drawText(value, { x, y, size, font: isBold ? bold : font, color: ink });
  }
  function paragraph(value: string, x: number, y: number, width = 540, size = 8.5) {
    let line = "";
    // Character wrapping also handles long identifiers and unbroken customer names.
    for (const word of value.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) { line = next; continue; }
      if (line) { draw(line, x, y, size); y -= size + 3; line = ""; }
      for (const character of word) {
        if (font.widthOfTextAtSize(line + character, size) > width) { draw(line, x, y, size); y -= size + 3; line = ""; }
        line += character;
      }
    }
    if (line) { draw(line, x, y, size); y -= size + 3; }
    return y;
  }
  function table(section: SummarySection, x: number, y: number, width: number) {
    draw(section.heading, x, y, 11, true);
    y -= 21;
    for (const [label, value] of section.rows ?? []) {
      draw(label, x, y, 8);
      draw(value, x + width - font.widthOfTextAtSize(value, 9), y, 9);
      page.drawLine({ start: { x, y: y - 5 }, end: { x: x + width, y: y - 5 }, color: rule, thickness: .4 });
      y -= 19;
    }
    return y;
  }
  draw("Time Motor Sales, Inc.", 36, 756, 13, true);
  draw("1101 E. Lake Street, Minneapolis, MN 55407 | 612-724-3631", 36, 740, 8);
  draw("timemotors.net | timemotorsale@gmail.com", 36, 727, 8);
  draw("Lease Summary", 36, 697, 22, true);
  let y = 676;
  for (const [label, value] of summary.identity) y = paragraph(`${label}: ${value}`, 36, y) - 2;
  y -= 12;
  page.drawLine({ start: { x: 36, y: y + 8 }, end: { x: 576, y: y + 8 }, color: rule });
  summary.highlights.forEach(([label, value], index) => {
    const x = 36 + index * 138;
    draw(label, x, y - 3, 8);
    draw(value, x, y - 24, 14, true);
  });
  y -= 44;
  page.drawLine({ start: { x: 36, y }, end: { x: 576, y }, color: rule });
  y -= 24;
  y = Math.min(table(summary.signing, 36, y, 255), table(summary.payments, 315, y, 261)) - 5;
  for (const section of summary.sections) {
    draw(section.heading, 36, y, 11, true);
    y -= 16;
    for (const value of section.paragraphs ?? []) y = paragraph(value, 36, y) - 3;
    y -= 5;
  }
  y = paragraph("I received and reviewed this lease summary.", 36, y) - 20;
  if (y < 64) throw new Error("Lease summary content exceeds the one-page layout.");
  const form = pdf.getForm();
  for (const [name, label, x, width] of [["lessee_summary_signature", "Lessee / co-lessee signature(s)", 36, 385], ["lessee_summary_date", "Date", 441, 135]] as const) {
    const field = form.createTextField(name);
    field.addToPage(page, { x, y, width, height: 18, borderColor: rule, borderWidth: .5 });
    field.setFontSize(9);
    draw(label, x, y - 11, 7.5);
  }
  paragraph("The signed lease and addenda control if there is a difference. Purchase-option taxes and fees, late charges, damage, and other contingent charges are not included in the estimated lease total.", 36, y - 28, 540, 7.5);
  form.updateFieldAppearances(font);
  return Buffer.from(await pdf.save()).toString("base64");
}
