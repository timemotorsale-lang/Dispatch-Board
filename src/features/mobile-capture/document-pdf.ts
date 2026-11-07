export const MAX_SCAN_PAGES = 12;
export const MAX_SCAN_BYTES = 25 * 1024 * 1024;

export type ScannedPage = { id: string; bytes: Uint8Array; rotation: number; url: string };
export type ScanPaperSize = "ORIGINAL" | "LETTER" | "A4";

export async function buildScannedPdf(pages: Pick<ScannedPage, "bytes" | "rotation">[], paperSize: ScanPaperSize = "ORIGINAL") {
  if (!pages.length || pages.length > MAX_SCAN_PAGES) throw new Error(`Include 1–${MAX_SCAN_PAGES} pages.`);
  if (pages.reduce((total, page) => total + page.bytes.length, 0) > MAX_SCAN_BYTES) throw new Error("This scan is too large. Remove pages or split it into separate documents.");
  const { PDFDocument, degrees } = await import("pdf-lib");
  const document = await PDFDocument.create();
  for (const scanned of pages) {
    const image = await document.embedJpg(scanned.bytes);
    const originalScale = Math.min(1, 842 / Math.max(image.width, image.height));
    const dimensions: [number, number] = paperSize === "LETTER" ? [612, 792] : paperSize === "A4" ? [595.28, 841.89] : [image.width * originalScale, image.height * originalScale];
    const margin = paperSize === "ORIGINAL" ? 0 : 18;
    const scale = Math.min((dimensions[0] - margin * 2) / image.width, (dimensions[1] - margin * 2) / image.height);
    const width = image.width * scale, height = image.height * scale;
    const page = document.addPage(dimensions);
    page.drawImage(image, { x: (dimensions[0] - width) / 2, y: (dimensions[1] - height) / 2, width, height });
    page.setRotation(degrees(((scanned.rotation % 360) + 360) % 360));
  }
  const bytes = await document.save();
  if (bytes.length > MAX_SCAN_BYTES) throw new Error("The PDF exceeds 25 MB. Remove pages or split the scan.");
  return bytes;
}
