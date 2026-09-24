import { inflateSync } from "node:zlib";

export type DocumentTextExtractionResult = {
  method: "PDF_TEXT" | "PLAIN_TEXT" | "OCR_UNAVAILABLE" | "UNSUPPORTED";
  text: string;
  warnings: string[];
};

function decodeUtf8(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\\r/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 60_000);
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
      streams.push(decodeUtf8(inflateSync(Buffer.from(raw, "binary"))));
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
      for (const literal of arrayText.matchAll(/\((?:\\.|[^\\()])*\)|<([0-9a-fA-F\s]+)>/g)) {
        const raw = literal[0];
        extracted.push(raw.startsWith("<") ? decodePdfHexString(raw.slice(1, -1)) : decodePdfLiteralString(raw.slice(1, -1)));
      }
      extracted.push("\n");
      continue;
    }
    const literal = token.match(/\((?:\\.|[^\\()])*\)/)?.[0];
    if (literal) extracted.push(decodePdfLiteralString(literal.slice(1, -1)));
  }
  return extracted.join(" ");
}

function extractPdfText(bytes: Uint8Array): DocumentTextExtractionResult {
  const pdfText = Buffer.from(bytes).toString("binary");
  const streams = inflatePdfStreams(pdfText);
  const extracted = normalizeExtractedText([
    stringsFromPdfContent(pdfText),
    ...streams.map(stringsFromPdfContent)
  ].join("\n"));
  return {
    method: "PDF_TEXT",
    text: extracted,
    warnings: extracted ? [] : ["No embedded PDF text was found. Scanned PDFs need OCR before amounts can be read automatically."]
  };
}

export async function extractDocumentText(input: {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
}): Promise<DocumentTextExtractionResult> {
  const contentType = input.contentType.toLowerCase();
  const fileName = input.fileName.toLowerCase();
  if (contentType.includes("pdf") || fileName.endsWith(".pdf")) return extractPdfText(input.bytes);
  if (contentType.startsWith("text/") || fileName.endsWith(".txt")) {
    return { method: "PLAIN_TEXT", text: normalizeExtractedText(decodeUtf8(input.bytes)), warnings: [] };
  }
  if (contentType.startsWith("image/")) {
    return {
      method: "OCR_UNAVAILABLE",
      text: "",
      warnings: ["Image OCR is not configured in this runtime yet. The file was stored, but text could not be read automatically."]
    };
  }
  return { method: "UNSUPPORTED", text: "", warnings: ["This file type does not support automatic text extraction yet."] };
}
