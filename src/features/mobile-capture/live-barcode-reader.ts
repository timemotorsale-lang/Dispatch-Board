import { idFromBarcode, vinFromBarcode } from "./barcode-review";

export type ScanResult = { format: string; value: string };
export type BarcodeMode = "id" | "vin" | "all";

const commonFormats = ["code_39", "code_128", "qr_code", "data_matrix", "pdf417", "code_93", "itf", "ean_13", "ean_8", "upc_a", "upc_e", "aztec", "codabar"];
type NativeCode = { format: string; rawValue: string };
type NativeReader = { detect: (source: HTMLVideoElement) => Promise<NativeCode[]> };
type NativeConstructor = {
  new (options: { formats: string[] }): NativeReader;
  getSupportedFormats?: () => Promise<string[]>;
};

export function normalizeScan(mode: BarcodeMode, format: string, rawValue: string): ScanResult | null {
  const value = mode === "vin" ? vinFromBarcode(rawValue) : rawValue.trim();
  const normalizedFormat = /^pdf_?417$/i.test(format) ? "PDF_417" : format.toUpperCase();
  if (!value || (mode === "id" && (normalizedFormat !== "PDF_417" || !idFromBarcode(value)))) return null;
  return { format: normalizedFormat, value };
}

export async function createNativeBarcodeReader(mode: BarcodeMode): Promise<NativeReader | null> {
  const Detector = (globalThis as typeof globalThis & { BarcodeDetector?: NativeConstructor }).BarcodeDetector;
  if (!Detector) return null;
  try {
    const available = await Detector.getSupportedFormats?.();
    const requested = mode === "id" ? ["pdf417"] : commonFormats;
    const formats = available ? requested.filter(format => available.includes(format)) : requested;
    return formats.length ? new Detector({ formats }) : null;
  } catch { return null; }
}

/** Probe the framing area first, but regularly read the entire image for off-center codes. */
export async function createSoftwareBarcodeReader(mode: BarcodeMode) {
  const { BarcodeFormat, BrowserMultiFormatReader, BrowserPDF417Reader } = await import("@zxing/browser");
  const universal = new BrowserMultiFormatReader();
  const focused = new BrowserMultiFormatReader(new Map());
  focused.possibleFormats = [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX];
  const pdf417 = new BrowserPDF417Reader();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return (video: HTMLVideoElement, frame: number): ScanResult | null => {
    if (!context || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
    const pass = frame % 5;
    const full = pass === 1 || pass === 4;
    const rotate = pass === 2 || pass === 4;
    const invert = pass === 3;
    const sourceWidth = full ? video.videoWidth : Math.floor(video.videoWidth * .9);
    const sourceHeight = full ? video.videoHeight : Math.floor(video.videoHeight * (mode === "vin" ? .62 : .78));
    const scale = Math.min(1, 1920 / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvasWidth = rotate ? height : width;
    const canvasHeight = rotate ? width : height;
    if (canvas.width !== canvasWidth) canvas.width = canvasWidth;
    if (canvas.height !== canvasHeight) canvas.height = canvasHeight;
    context.save();
    try {
      if (rotate) { context.translate(canvasWidth, 0); context.rotate(Math.PI / 2); }
      if (invert) context.filter = "invert(1)";
      context.drawImage(video, Math.floor((video.videoWidth - sourceWidth) / 2), Math.floor((video.videoHeight - sourceHeight) / 2), sourceWidth, sourceHeight, 0, 0, width, height);
    } finally { context.restore(); }
    try {
      const reader = mode === "id" ? pdf417 : mode === "vin" && !full ? focused : universal;
      const code = reader.decodeFromCanvas(canvas);
      return normalizeScan(mode, BarcodeFormat[code.getBarcodeFormat()], code.getText());
    } catch { return null; }
  };
}
