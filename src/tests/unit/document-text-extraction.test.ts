import { afterEach, describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";

import { extractDocumentText } from "@/server/document-library/text-extraction";

function minimalPdfWithText(text: string) {
  const stream = `BT /F1 12 Tf 72 720 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`;
  const compressed = deflateSync(Buffer.from(stream, "binary")).toString("binary");
  return Buffer.from(`%PDF-1.4
1 0 obj
<< /Length ${compressed.length} /Filter /FlateDecode >>
stream
${compressed}
endstream
endobj
%%EOF`, "binary");
}

describe("document text extraction", () => {
  afterEach(() => {
    delete process.env.DOCUMENT_TEXT_OCR_MODE;
  });

  it("extracts embedded text from PDF content streams", async () => {
    const result = await extractDocumentText({
      bytes: minimalPdfWithText("Approved repair amount $6,642.31"),
      contentType: "application/pdf",
      fileName: "estimate.pdf"
    });

    expect(result.method).toBe("PDF_TEXT");
    expect(result.text).toContain("Approved repair amount $6,642.31");
    expect(result.warnings).toEqual([]);
  });

  it("uses the configured OCR engine for image uploads", async () => {
    const result = await extractDocumentText({
      bytes: Uint8Array.from([137, 80, 78, 71]),
      contentType: "image/png",
      fileName: "estimate.png"
    }, {
      recognizeImageText: async () => "Approved repair amount $6,642.31"
    });

    expect(result).toMatchObject({
      method: "OCR_TEXT",
      text: "Approved repair amount $6,642.31",
      warnings: []
    });
  });

  it("flags image uploads when OCR is disabled", async () => {
    process.env.DOCUMENT_TEXT_OCR_MODE = "disabled";
    const result = await extractDocumentText({
      bytes: Uint8Array.from([137, 80, 78, 71]),
      contentType: "image/png",
      fileName: "estimate.png"
    });

    expect(result).toMatchObject({
      method: "OCR_UNAVAILABLE",
      text: ""
    });
    expect(result.warnings[0]).toContain("Image OCR is disabled");
  });
});
