import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractDocumentText } from "../document-library/text-extraction";

const run = promisify(execFile);

export async function verifyPurchaseOcr() {
  const root = await mkdtemp(join(tmpdir(), "purchase-ocr-health-"));
  try {
    const source = await PDFDocument.create();
    const page = source.addPage([612, 792]);
    const font = await source.embedFont(StandardFonts.CourierBold);
    page.drawText("Purchase invoice", { x: 50, y: 700, size: 24, font });
    page.drawText("VIN: 1HGCM82633A004352", { x: 50, y: 640, size: 20, font });
    page.drawText("Purchase price: $12500.00", { x: 50, y: 580, size: 20, font });
    const input = join(root, "source.pdf"), output = join(root, "scan");
    await writeFile(input, await source.save(), { mode: 0o600 });
    await run(process.env.DOCUMENT_TEXT_PDF_RENDERER_PATH?.trim() || "pdftoppm", ["-png", "-singlefile", "-r", "180", input, output], { timeout: 60_000, windowsHide: true, maxBuffer: 64 * 1024 });
    const scanned = await PDFDocument.create();
    const image = await scanned.embedPng(await readFile(`${output}.png`));
    scanned.addPage([612, 792]).drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
    const result = await extractDocumentText({ bytes: await scanned.save(), contentType: "application/pdf", fileName: "scanner-health.pdf" });
    const vinRead = /1HGCM82633A004352/.test(result.text), amountRead = /12[,]?500[.,]00/.test(result.text);
    return { ready: result.method === "OCR_TEXT" && vinRead && amountRead, method: result.method, vinRead, amountRead };
  } catch {
    return { ready: false, method: "UNAVAILABLE" };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
