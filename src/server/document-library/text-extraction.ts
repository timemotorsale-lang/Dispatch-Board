import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DocumentTextExtractionResult = {
  method: "PDF_TEXT" | "PLAIN_TEXT" | "OCR_TEXT" | "OCR_FAILED" | "OCR_UNAVAILABLE" | "UNSUPPORTED";
  text: string;
  warnings: string[];
};

export type DocumentTextExtractionDependencies = {
  recognizeImageText?: (input: { bytes: Uint8Array; contentType: string; fileName: string }) => Promise<string>;
};

function decodeUtf8(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .replace(/\\r/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 60_000);
}

function hasMeaningfulText(value: string) {
  const text = normalizeExtractedText(value);
  if (text.length < 20) return false;
  const letters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const digits = text.match(/[0-9]/g)?.length ?? 0;
  const words = text.match(/[A-Za-z]{3,}/g)?.length ?? 0;
  const moneyLike = /\$?\s*[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|\$\s*[0-9]+(?:\.[0-9]{2})?/.test(text);
  return words >= 8 || moneyLike && letters >= 4 || letters + digits >= 80 && words >= 3;
}

function decodePdfLiteralString(value: string) {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      output += char;
      continue;
    }
    const next = value[index + 1];
    if (!next) break;
    index += 1;
    if (next === "n") output += "\n";
    else if (next === "r") output += "\r";
    else if (next === "t") output += "\t";
    else if (next === "b") output += "\b";
    else if (next === "f") output += "\f";
    else if (next === "(" || next === ")" || next === "\\") output += next;
    else if (/[0-7]/.test(next)) {
      const octal = `${next}${value.slice(index + 1, index + 3).match(/^[0-7]{0,2}/)?.[0] ?? ""}`;
      index += octal.length - 1;
      output += String.fromCharCode(Number.parseInt(octal, 8));
    } else {
      output += next;
    }
  }
  return output;
}

function decodePdfHexString(value: string) {
  const clean = value.replace(/[^0-9a-f]/gi, "");
  const padded = clean.length % 2 === 0 ? clean : `${clean}0`;
  const bytes = Uint8Array.from(padded.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) ?? []);
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let output = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      output += String.fromCharCode((bytes[index] << 8) + bytes[index + 1]);
    }
    return output;
  }
  return decodeUtf8(bytes);
}

function inflatePdfStreams(pdfText: string) {
  const streams: string[] = [];
  const pattern = /<<(?:.|\n|\r)*?\/Filter\s*(?:\/FlateDecode|\[\s*\/FlateDecode\s*\])(?:.|\n|\r)*?>>\s*stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(pdfText))) {
    const start = match.index + match[0].length;
    const end = pdfText.indexOf("endstream", start);
    if (end === -1) break;
    const raw = pdfText.slice(start, end).replace(/\r?\n$/, "");
    try {
      streams.push(decodeUtf8(inflateSync(Buffer.from(raw, "binary"), { maxOutputLength: 4 * 1024 * 1024 })));
      if (streams.length >= 20) break;
    } catch {
      // Keep scanning other streams; malformed or image streams are expected in many PDFs.
    }
  }
  return streams;
}

function stringsFromPdfContent(content: string) {
  const extracted: string[] = [];
  const tokenPattern = /\((?:\\.|[^\\()])*\)\s*(?:Tj|'|"|TJ)|<([0-9a-fA-F\s]+)>\s*(?:Tj|'|"|TJ)|\[([\s\S]*?)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(content))) {
    const token = match[0];
    if (match[1]) {
      extracted.push(decodePdfHexString(match[1]));
      continue;
    }
    if (match[2]) {
      const arrayText = match[2];
      const fragments: string[] = [];
      for (const literal of arrayText.matchAll(/\((?:\\.|[^\\()])*\)|<([0-9a-fA-F\s]+)>/g)) {
        const raw = literal[0];
        fragments.push(raw.startsWith("<") ? decodePdfHexString(raw.slice(1, -1)) : decodePdfLiteralString(raw.slice(1, -1)));
      }
      extracted.push(fragments.join(""));
      continue;
    }
    const literal = token.match(/\((?:\\.|[^\\()])*\)/)?.[0];
    if (literal) extracted.push(decodePdfLiteralString(literal.slice(1, -1)));
  }
  return extracted.join("\n");
}

function pdfOcrEnabled() {
  return (process.env.DOCUMENT_TEXT_PDF_OCR_MODE ?? process.env.DOCUMENT_TEXT_OCR_MODE ?? "enabled").trim().toLowerCase() !== "disabled";
}

async function renderPdfPagesForOcr(bytes: Uint8Array) {
  const root = await mkdtemp(join(tmpdir(), "dispatch-pdf-ocr-"));
  const inputPath = join(root, "input.pdf");
  const outputPrefix = join(root, "page");
  await writeFile(inputPath, bytes);
  const renderer = process.env.DOCUMENT_TEXT_PDF_RENDERER_PATH?.trim() || "pdftoppm";
  const maxPages = Math.max(1, Math.min(10, Number(process.env.DOCUMENT_TEXT_PDF_OCR_MAX_PAGES) || 3));
  try { await execFileAsync(renderer, [
    "-png",
    "-r",
    process.env.DOCUMENT_TEXT_PDF_OCR_DPI?.trim() || "220",
    "-f",
    "1",
    "-l",
    String(maxPages),
    inputPath,
    outputPrefix
  ], { windowsHide: true, timeout: 60_000 }); }
  catch (error) { await rm(root, { force: true, recursive: true }); throw error; }
  const files = (await readdir(root))
    .filter((file) => /^page-\d+\.png$/i.test(file))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  return { files: files.map((file) => join(root, file)), root };
}

async function ocrPdfPages(
  input: { bytes: Uint8Array; contentType: string; fileName: string },
  dependencies: DocumentTextExtractionDependencies
): Promise<DocumentTextExtractionResult> {
  if (!pdfOcrEnabled() && !dependencies.recognizeImageText) {
    return {
      method: "OCR_UNAVAILABLE",
      text: "",
      warnings: ["PDF OCR is disabled. Set DOCUMENT_TEXT_PDF_OCR_MODE=enabled to OCR PDFs with unreadable embedded text."]
    };
  }

  let rendered: { files: string[]; root: string } | null = null;
  try {
    rendered = await renderPdfPagesForOcr(input.bytes);
    const pageTexts: string[] = [];
    for (const file of rendered.files) {
      const pageBytes = await readFile(file);
      const pageText = await (dependencies.recognizeImageText ?? recognizeImageText)({
        bytes: pageBytes,
        contentType: "image/png",
        fileName: file
      });
      if (pageText.trim()) pageTexts.push(pageText);
    }
    const text = normalizeExtractedText(pageTexts.join("\n\n"));
    return {
      method: text ? "OCR_TEXT" : "OCR_FAILED",
      text,
      warnings: text ? ["PDF embedded text was unreadable, so OCR was used."] : ["PDF OCR ran, but no readable text was found."]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF OCR failed.";
    return {
      method: "OCR_FAILED",
      text: "",
      warnings: [`PDF OCR could not read this file: ${message}`]
    };
  } finally {
    if (rendered) await rm(rendered.root, { force: true, recursive: true });
  }
}

async function extractPdfText(
  input: { bytes: Uint8Array; contentType: string; fileName: string },
  dependencies: DocumentTextExtractionDependencies
): Promise<DocumentTextExtractionResult> {
  const bytes = input.bytes;
  const pdfText = Buffer.from(bytes).toString("binary");
  const streams = inflatePdfStreams(pdfText);
  const extracted = normalizeExtractedText([
    stringsFromPdfContent(pdfText),
    ...streams.map(stringsFromPdfContent)
  ].join("\n"));
  if (!hasMeaningfulText(extracted)) {
    const ocrResult = await ocrPdfPages(input, dependencies);
    if (ocrResult.text) return ocrResult;
    return {
      method: "PDF_TEXT",
      text: extracted,
      warnings: [
        "Embedded PDF text was missing or unreadable.",
        ...ocrResult.warnings
      ]
    };
  }
  return {
    method: "PDF_TEXT",
    text: extracted,
    warnings: extracted ? [] : ["No embedded PDF text was found. Scanned PDFs need OCR before amounts can be read automatically."]
  };
}

function ocrEnabled() {
  return (process.env.DOCUMENT_TEXT_OCR_MODE ?? "enabled").trim().toLowerCase() !== "disabled";
}

async function recognizeImageText(input: { bytes: Uint8Array; contentType: string; fileName: string }) {
  const { createWorker, PSM } = await import("tesseract.js");
  const defaultLangPath = join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
  const worker = await createWorker(process.env.DOCUMENT_TEXT_OCR_LANGUAGES?.trim() || "eng", undefined, {
    cachePath: process.env.DOCUMENT_TEXT_OCR_CACHE_PATH?.trim() || join(process.cwd(), ".dispatch-board-data", "tesseract-cache"),
    ...(process.env.DOCUMENT_TEXT_OCR_CORE_PATH?.trim() ? { corePath: process.env.DOCUMENT_TEXT_OCR_CORE_PATH.trim() } : {}),
    langPath: process.env.DOCUMENT_TEXT_OCR_LANG_PATH?.trim() || defaultLangPath,
    ...(process.env.DOCUMENT_TEXT_OCR_WORKER_PATH?.trim() ? { workerPath: process.env.DOCUMENT_TEXT_OCR_WORKER_PATH.trim() } : {})
  });
  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: PSM.AUTO
    });
    const result = await worker.recognize(Buffer.from(input.bytes));
    return normalizeExtractedText(result.data.text ?? "");
  } finally {
    await worker.terminate();
  }
}

async function extractImageText(
  input: { bytes: Uint8Array; contentType: string; fileName: string },
  dependencies: DocumentTextExtractionDependencies
): Promise<DocumentTextExtractionResult> {
  if (!ocrEnabled() && !dependencies.recognizeImageText) {
    return {
      method: "OCR_UNAVAILABLE",
      text: "",
      warnings: ["Image OCR is disabled. Set DOCUMENT_TEXT_OCR_MODE=enabled to read text from image uploads."]
    };
  }

  try {
    const text = normalizeExtractedText(await (dependencies.recognizeImageText ?? recognizeImageText)(input));
    return {
      method: text ? "OCR_TEXT" : "OCR_FAILED",
      text,
      warnings: text ? [] : ["OCR ran, but no readable text was found in this image."]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed.";
    return {
      method: "OCR_FAILED",
      text: "",
      warnings: [`OCR could not read this image: ${message}`]
    };
  }
}

export async function extractDocumentText(input: {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
}, dependencies: DocumentTextExtractionDependencies = {}): Promise<DocumentTextExtractionResult> {
  const contentType = input.contentType.toLowerCase();
  const fileName = input.fileName.toLowerCase();
  if (contentType.includes("pdf") || fileName.endsWith(".pdf")) return extractPdfText(input, dependencies);
  if (contentType.startsWith("text/") || fileName.endsWith(".txt")) {
    return { method: "PLAIN_TEXT", text: normalizeExtractedText(decodeUtf8(input.bytes)), warnings: [] };
  }
  if (contentType.startsWith("image/")) {
    return extractImageText(input, dependencies);
  }
  return { method: "UNSUPPORTED", text: "", warnings: ["This file type does not support automatic text extraction yet."] };
}
