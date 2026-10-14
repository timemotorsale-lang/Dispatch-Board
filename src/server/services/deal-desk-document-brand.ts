import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PDFDocument, PDFPage } from "pdf-lib";

let logoBytes: Buffer | undefined;

function documentLogoBytes() {
  logoBytes ??= readFileSync(join(process.cwd(), "public", "brand", "time-motor-sales-horizontal.png"));
  return logoBytes;
}

export function dealDeskLogoHtml(floatRight = false) {
  const source = `data:image/png;base64,${documentLogoBytes().toString("base64")}`;
  return `<img alt="Time Motor Sales" src="${source}" width="${floatRight ? 156 : 200}" height="${floatRight ? 29.25 : 37.5}" style="${floatRight ? "float:right;margin-left:12px;" : "display:block;margin-bottom:8px;"}width:${floatRight ? 156 : 200}px;max-width:${floatRight ? "30%" : "100%"};height:auto;object-fit:contain;" />`;
}

export async function drawDealDeskPdfLogo(
  pdf: PDFDocument,
  page: PDFPage,
  placement = { x: 420, y: 746, width: 156 }
) {
  const logo = await pdf.embedPng(documentLogoBytes());
  page.drawImage(logo, { ...placement, height: placement.width * logo.height / logo.width });
}
