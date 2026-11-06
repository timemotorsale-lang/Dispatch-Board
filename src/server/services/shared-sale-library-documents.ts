import { PDFDocument, StandardFonts } from "pdf-lib";

/** Preserve the existing pathway document's words in a printable PDF; retain its HTML alongside it. */
export async function pathwayDocumentPdf(html: string) {
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<head[\s\S]*?<\/head>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<\/(p|div|h[1-6]|tr|li)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica);
  let page = pdf.addPage([612, 792]), y = 750;
  for (const paragraph of text.split(/\n+/).map(line => line.trim()).filter(Boolean)) {
    let line = "";
    const plain = paragraph.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^\x20-\x7e]/g, " ");
    function draw() { if (y < 45) { page = pdf.addPage([612, 792]); y = 750; } page.drawText(line, { x: 36, y, size: 10, font }); y -= 14; }
    for (const word of plain.split(/\s+/)) { if (line && font.widthOfTextAtSize(`${line} ${word}`, 10) > 535) { draw(); line = word; } else line = line ? `${line} ${word}` : word; }
    if (line) draw(); y -= 5;
  }
  return Buffer.from(await pdf.save()).toString("base64");
}
