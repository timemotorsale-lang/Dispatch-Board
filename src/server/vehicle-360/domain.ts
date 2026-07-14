import { createHash } from "node:crypto";

export const VEHICLE_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const VEHICLE_EVIDENCE_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"] as const;
export const VEHICLE_EVIDENCE_CATEGORIES = ["PHOTO", "INSPECTION", "REPAIR", "TITLE", "WARRANTY", "CUSTOMER_APPROVAL", "DELIVERY", "OTHER"] as const;
export const VEHICLE_EVIDENCE_ACCESS_LEVELS = ["INTERNAL", "RESTRICTED"] as const;

function object(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function required(value: unknown, label: string, max = 500) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

function optional(value: unknown, max = 500) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > max) throw new Error(`Value must be ${max} characters or fewer.`);
  return result || null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string) {
  const result = String(value ?? "").trim().toUpperCase() as T;
  if (!allowed.includes(result)) throw new Error(`${label} is invalid.`);
  return result;
}

function parseBase64(value: unknown) {
  const encoded = required(value, "Base64 file content", Math.ceil(VEHICLE_EVIDENCE_MAX_BYTES * 1.4));
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) throw new Error("File content must be valid base64.");
  const content = Buffer.from(encoded, "base64");
  if (!content.length) throw new Error("Evidence files cannot be empty.");
  if (content.length > VEHICLE_EVIDENCE_MAX_BYTES) throw new Error("Evidence files cannot exceed 10 MB.");
  return content;
}

function safeFileName(value: unknown) {
  const fileName = required(value, "File name", 240);
  if (fileName.includes("/") || fileName.includes("\\") || fileName === "." || fileName === "..") throw new Error("File name cannot contain a path.");
  return fileName.replace(/[\u0000-\u001f\u007f]/g, "");
}

function retention(value: unknown, now: Date) {
  const date = new Date(required(value, "Retention date", 100));
  if (Number.isNaN(date.getTime())) throw new Error("Retention date must be valid.");
  if (date.getTime() < now.getTime() + 24 * 60 * 60_000) throw new Error("Retention must extend at least one day beyond upload.");
  const maximum = new Date(now); maximum.setUTCFullYear(maximum.getUTCFullYear() + 10);
  if (date > maximum) throw new Error("Retention cannot exceed ten years without a policy change.");
  return date;
}

export type EvidenceScanResult = { malwareStatus: "CLEAN" | "DETECTED"; malwareScanner: string; reasonCode: string };

export function scanVehicleEvidence(content: Buffer, contentType: string): EvidenceScanResult {
  const prefix = content.subarray(0, Math.min(content.length, 8192));
  const text = prefix.toString("utf8").toUpperCase();
  const executable = prefix.length >= 2 && prefix[0] === 0x4d && prefix[1] === 0x5a;
  const eicar = text.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE");
  const activeMarkup = text.includes("<SCRIPT") || text.includes("JAVASCRIPT:");
  if (executable || eicar || activeMarkup) return { malwareStatus: "DETECTED", malwareScanner: "BUILTIN_SIGNATURE_BASELINE_V1", reasonCode: executable ? "EXECUTABLE_SIGNATURE" : eicar ? "EICAR_SIGNATURE" : "ACTIVE_MARKUP_SIGNATURE" };
  const signatures: Record<string, (buffer: Buffer) => boolean> = {
    "application/pdf": (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-",
    "image/jpeg": (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    "image/png": (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/webp": (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
    "text/plain": () => !prefix.includes(0)
  };
  if (!signatures[contentType]?.(content)) return { malwareStatus: "DETECTED", malwareScanner: "BUILTIN_SIGNATURE_BASELINE_V1", reasonCode: "CONTENT_TYPE_SIGNATURE_MISMATCH" };
  return { malwareStatus: "CLEAN", malwareScanner: "BUILTIN_SIGNATURE_BASELINE_V1", reasonCode: "BASELINE_CLEAN" };
}

export function normalizeEvidenceUpload(value: unknown, now: Date) {
  const raw = object(value, "Evidence upload");
  const contentType = String(raw.contentType ?? "").trim().toLowerCase() as (typeof VEHICLE_EVIDENCE_CONTENT_TYPES)[number];
  if (!VEHICLE_EVIDENCE_CONTENT_TYPES.includes(contentType)) throw new Error("Content type is invalid.");
  const content = parseBase64(raw.contentBase64);
  const scan = scanVehicleEvidence(content, contentType);
  return {
    accessLevel: oneOf(raw.accessLevel ?? "INTERNAL", VEHICLE_EVIDENCE_ACCESS_LEVELS, "Access level"),
    category: oneOf(raw.category ?? "OTHER", VEHICLE_EVIDENCE_CATEGORIES, "Evidence category"),
    checksumSha256: createHash("sha256").update(content).digest("hex"),
    content,
    contentType,
    fileName: safeFileName(raw.fileName),
    idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200),
    reason: required(raw.reason, "Business reason", 500),
    relationship: required(raw.relationship ?? "SUPPORTS", "Evidence relationship", 100).toUpperCase(),
    retentionUntil: retention(raw.retentionUntil, now),
    scan,
    subjectId: optional(raw.subjectId, 100),
    subjectType: required(raw.subjectType ?? "VEHICLE", "Subject type", 100).toUpperCase(),
    vehicleId: required(raw.vehicleId, "Vehicle ID", 100)
  };
}

export function normalizeEvidenceGovernance(value: unknown, now: Date) {
  const raw = object(value, "Evidence governance update");
  const expectedVersion = Number(raw.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected evidence version must be a positive whole number.");
  return {
    accessLevel: raw.accessLevel == null ? null : oneOf(raw.accessLevel, VEHICLE_EVIDENCE_ACCESS_LEVELS, "Access level"),
    expectedVersion,
    idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200),
    legalHold: raw.legalHold == null ? null : Boolean(raw.legalHold),
    reason: required(raw.reason, "Business reason", 500),
    retentionUntil: raw.retentionUntil == null ? null : retention(raw.retentionUntil, now)
  };
}

export function stableEvidenceId(organizationId: string, idempotencyKey: string) {
  return `evi-${createHash("sha256").update(`${organizationId}:${idempotencyKey.trim()}`).digest("hex").slice(0, 24)}`;
}

export type Vehicle360TimelineItem = { id: string; occurredAt: Date; source: string; type: string; title: string; detail: string | null; subjectType: string; subjectId: string };

export function sortVehicleTimeline(items: Vehicle360TimelineItem[], limit = 200) {
  return [...items].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || a.id.localeCompare(b.id)).slice(0, limit);
}
