import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn(), extract: vi.fn(), remove: vi.fn() }));
vi.mock("node:util", () => ({ promisify: () => mocks.run }));
vi.mock("node:fs/promises", () => ({ mkdtemp: async () => "/temporary/ocr-health", writeFile: vi.fn(), readFile: async () => Buffer.from("image"), rm: mocks.remove }));
vi.mock("pdf-lib", () => ({
  StandardFonts: { CourierBold: "CourierBold" },
  PDFDocument: { create: async () => ({ addPage: () => ({ drawText: vi.fn(), drawImage: vi.fn() }), embedFont: async () => ({}), embedPng: async () => ({}), save: async () => Buffer.from("pdf") }) }
}));
vi.mock("@/server/document-library/text-extraction", () => ({ extractDocumentText: mocks.extract }));
import { verifyPurchaseOcr } from "@/server/inventory-transfer/purchase-ocr-health";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.run.mockResolvedValue({});
  mocks.extract.mockResolvedValue({ method: "OCR_TEXT", text: "VIN: 1HGCM82633A004352 Purchase price: $12,500.00" });
});

describe("purchase OCR release check", () => {
  it("requires both identity and amount from actual OCR, and removes its temporary files", async () => {
    expect(await verifyPurchaseOcr()).toMatchObject({ ready: true, vinRead: true, amountRead: true });
    expect(mocks.remove).toHaveBeenCalledWith("/temporary/ocr-health", { recursive: true, force: true });
    expect(mocks.run.mock.calls[0][2]).toMatchObject({ timeout: 60_000, windowsHide: true });
  });
  it("fails closed for missing renderer, disabled OCR, or misread identity or amount", async () => {
    mocks.run.mockRejectedValueOnce(new Error("missing renderer"));
    expect((await verifyPurchaseOcr()).ready).toBe(false);
    for (const result of [
      { method: "OCR_UNAVAILABLE", text: "" },
      { method: "PDF_TEXT", text: "1HGCM82633A004352 12500.00" },
      { method: "OCR_TEXT", text: "1HGCM82633A004352 12500.09" },
      { method: "OCR_TEXT", text: "IHGCM82633A004352 12500.00" }
    ]) {
      mocks.extract.mockResolvedValueOnce(result);
      expect((await verifyPurchaseOcr()).ready).toBe(false);
    }
    expect(mocks.remove).toHaveBeenCalledTimes(5);
  });
});
