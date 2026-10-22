export const MAX_SCAN_PAGES = 12;
export const MAX_SCAN_BYTES = 25 * 1024 * 1024;

export type ScannedPage = { id: string; bytes: Uint8Array; rotation: number; url: string };

export async function buildScannedPdf(pages: Pick<ScannedPage, "bytes" | "rotation">[]) {
  if (!pages.length || pages.length > MAX_SCAN_PAGES) throw new Error(`Include 1–${MAX_SCAN_PAGES} pages.`);
  if (pages.reduce((total, page) => total + page.bytes.length, 0) > MAX_SCAN_BYTES) throw new Error("This scan is too large. Remove pages or split it into separate documents.");
  const { PDFDocument, degrees } = await import("pdf-lib");
  const document = await PDFDocument.create();
  for (const scanned of pages) {
    const image = await document.embedJpg(scanned.bytes);
    const scale = Math.min(1, 842 / Math.max(image.width, image.height));
    const width = image.width * scale, height = image.height * scale;
    const page = document.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    page.setRotation(degrees(((scanned.rotation % 360) + 360) % 360));
  }
  const bytes = await document.save();
  if (bytes.length > MAX_SCAN_BYTES) throw new Error("The PDF exceeds 25 MB. Remove pages or split the scan.");
  return bytes;
}
