import { createHash } from "node:crypto";

export const OPERATIONAL_SEARCH_TYPES = ["VEHICLE", "CUSTOMER", "REPAIR_ORDER", "REPAIR_JOB", "APPOINTMENT", "PART", "PURCHASE_ORDER", "DOCUMENT", "WORK_ITEM"] as const;
export type OperationalSearchType = (typeof OPERATIONAL_SEARCH_TYPES)[number];
export type OperationalSearchResult = { id: string; type: OperationalSearchType; label: string; detail: string; status: string | null; href: string; matchedFields: string[]; score: number };

function record(value: unknown, label: string) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`); return value as Record<string, unknown>; }
function required(value: unknown, label: string, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; }
function optional(value: unknown, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (result.length > max) throw new Error(`Value must be ${max} characters or fewer.`); return result || null; }
function date(value: unknown, label: string) { const result = new Date(required(value, label, 100)); if (Number.isNaN(result.getTime())) throw new Error(`${label} must be valid.`); return result; }

export function normalizeOperationalSearch(input: { limit?: unknown; query?: unknown; types?: unknown }) {
  const query = required(input.query, "Search query", 100).replace(/\s+/g, " ");
  if (query.length < 2) throw new Error("Search query must contain at least two characters.");
  const limit = Math.min(100, Math.max(1, Number(input.limit) || 50));
  const rawTypes = Array.isArray(input.types) ? input.types : typeof input.types === "string" ? input.types.split(",") : OPERATIONAL_SEARCH_TYPES;
  const types = [...new Set(rawTypes.map((item) => String(item).trim().toUpperCase()).filter((item): item is OperationalSearchType => OPERATIONAL_SEARCH_TYPES.includes(item as OperationalSearchType)))];
  if (!types.length) throw new Error("At least one valid search type is required.");
  return { limit, query, types };
}

export function scoreOperationalSearchResult(query: string, fields: Record<string, string | null | undefined>) {
  const needle = query.trim().toLowerCase(); let score = 0; const matchedFields: string[] = [];
  for (const [field, raw] of Object.entries(fields)) {
    const value = raw?.trim().toLowerCase(); if (!value || !value.includes(needle)) continue;
    matchedFields.push(field); score += value === needle ? 100 : value.startsWith(needle) ? 60 : 25;
    if (["vin", "stockNumber", "vehicleNumber", "customerNumber", "repairOrderNumber", "jobNumber", "appointmentNumber", "partNumber", "purchaseOrderNumber", "taskId"].includes(field)) score += 20;
  }
  return { matchedFields, score };
}

export function rankOperationalSearchResults(results: OperationalSearchResult[], limit: number) {
  return [...results].sort((a, b) => b.score - a.score || a.type.localeCompare(b.type) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id)).slice(0, limit);
}

export const WORK_KNOWLEDGE_TYPES = ["PROCEDURE", "BULLETIN", "SAFETY_NOTE", "REFERENCE"] as const;
export function normalizeKnowledgeDraft(value: unknown, now: Date) {
  const raw = record(value, "Knowledge link"); const effectiveFrom = raw.effectiveFrom ? date(raw.effectiveFrom, "Effective start") : now, effectiveTo = raw.effectiveTo ? date(raw.effectiveTo, "Effective end") : null;
  if (effectiveTo && effectiveTo <= effectiveFrom) throw new Error("Effective end must follow effective start.");
  const uri = required(raw.uri, "Knowledge URI", 1000); let parsed: URL; try { parsed = new URL(uri); } catch { throw new Error("Knowledge URI must be a valid HTTPS URL."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Knowledge URI must use HTTPS without embedded credentials.");
  const type = String(raw.type ?? "").toUpperCase() as (typeof WORK_KNOWLEDGE_TYPES)[number]; if (!WORK_KNOWLEDGE_TYPES.includes(type)) throw new Error("Knowledge type is invalid.");
  const contentHashSha256 = required(raw.contentHashSha256, "Publisher content hash", 64).toLowerCase(); if (!/^[0-9a-f]{64}$/.test(contentHashSha256)) throw new Error("Publisher content hash must be a SHA-256 value.");
  return { contentHashSha256, effectiveFrom, effectiveTo, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), procedureVersionId: optional(raw.procedureVersionId, 100), reason: required(raw.reason, "Business reason", 500), revision: required(raw.revision, "Revision", 100), sourceOrganization: required(raw.sourceOrganization, "Source organization", 200), sourceReference: required(raw.sourceReference, "Source reference", 200), supersedesId: optional(raw.supersedesId, 100), title: required(raw.title, "Title", 240), type, uri: parsed.toString(), workTypeCode: required(raw.workTypeCode, "Work type code", 100).toUpperCase() };
}

export function normalizeKnowledgeApproval(value: unknown) { const raw = record(value, "Knowledge approval"); const expectedVersion = Number(raw.expectedVersion); if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected version must be a positive whole number."); return { expectedVersion, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), reason: required(raw.reason, "Approval reason", 500) }; }

export const VEHICLE_OUTPUT_FORMATS = ["JSON", "PRINT_HTML"] as const;
export const VEHICLE_OUTPUT_CLASSIFICATIONS = ["INTERNAL", "RESTRICTED"] as const;
export function normalizeControlledOutput(value: unknown) { const raw = record(value, "Controlled output"); const format = String(raw.format ?? "").toUpperCase() as (typeof VEHICLE_OUTPUT_FORMATS)[number], classification = String(raw.classification ?? "INTERNAL").toUpperCase() as (typeof VEHICLE_OUTPUT_CLASSIFICATIONS)[number]; if (!VEHICLE_OUTPUT_FORMATS.includes(format)) throw new Error("Output format is invalid."); if (!VEHICLE_OUTPUT_CLASSIFICATIONS.includes(classification)) throw new Error("Output classification is invalid."); return { classification, format, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), reason: required(raw.reason, "Export reason", 500), vehicleId: required(raw.vehicleId, "Vehicle ID", 100) }; }

function canonical(value: unknown): string { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`; }
function maskVin(vin: unknown) { const value = typeof vin === "string" ? vin : ""; return value ? `***********${value.slice(-6)}` : null; }

export function buildControlledVehiclePackage(input: { classification: "INTERNAL" | "RESTRICTED"; generatedAt: Date; generatedBy: { id: string; name: string }; reason: string; view: Record<string, unknown> }) {
  const source = structuredClone(input.view), summary = source.summary as Record<string, unknown>, vehicle = summary.vehicle as Record<string, unknown>, tabs = source.tabs as Record<string, unknown>;
  const redactedFields: string[] = [];
  if (input.classification === "INTERNAL") {
    vehicle.vin = maskVin(vehicle.vin); redactedFields.push("summary.vehicle.vin");
    delete tabs.audit; delete tabs.communications; redactedFields.push("tabs.audit", "tabs.communications");
    const documents = tabs.documents as { items?: Array<Record<string, unknown>> } | undefined;
    const restrictedDocumentIds = new Set((documents?.items ?? []).filter((document) => (document.evidenceObject as Record<string, unknown> | undefined)?.accessLevel === "RESTRICTED").map((document) => String(document.evidenceObjectId)));
    if (documents?.items) documents.items = documents.items.filter((document) => !restrictedDocumentIds.has(String(document.evidenceObjectId)));
    if (restrictedDocumentIds.size) {
      redactedFields.push("tabs.documents.items[restricted]");
      if (Array.isArray(source.timeline)) source.timeline = source.timeline.filter((item) => !restrictedDocumentIds.has(String((item as Record<string, unknown>).subjectId)));
      const graph = source.graph as { nodes?: Array<Record<string, unknown>>; edges?: Array<Record<string, unknown>> } | undefined;
      if (graph?.nodes) graph.nodes = graph.nodes.filter((node) => !restrictedDocumentIds.has(String(node.id)));
      if (graph?.edges) graph.edges = graph.edges.filter((edge) => !restrictedDocumentIds.has(String(edge.from)) && !restrictedDocumentIds.has(String(edge.to)));
    }
    for (const document of documents?.items ?? []) { if ("downloadUrl" in document) { delete document.downloadUrl; redactedFields.push("tabs.documents.items[].downloadUrl"); } }
  }
  const watermark = `${input.classification} · ${input.generatedBy.name} · ${input.generatedAt.toISOString()}`;
  const packageSnapshot = { schemaVersion: "vehicle-controlled-output/v1", generatedAt: input.generatedAt.toISOString(), generatedBy: input.generatedBy, classification: input.classification, reason: input.reason, watermark, summary, timeline: source.timeline, tabs, graph: source.graph };
  return { checksumSha256: createHash("sha256").update(canonical(packageSnapshot)).digest("hex"), fieldManifest: Object.keys(tabs).sort(), packageSnapshot, redactedFields: [...new Set(redactedFields)], watermark };
}

export function stableControlledId(prefix: string, organizationId: string, idempotencyKey: string) { return `${prefix}-${createHash("sha256").update(`${organizationId}:${idempotencyKey.trim()}`).digest("hex").slice(0, 24)}`; }

function escapeHtml(value: unknown) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
export function renderControlledPrint(packageSnapshot: Record<string, unknown>) { const summary = packageSnapshot.summary as Record<string, unknown>, vehicle = summary.vehicle as Record<string, unknown>; return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(vehicle.vehicleNumber)} Vehicle 360</title><style>body{font-family:Arial,sans-serif;margin:36px;color:#172033}header{border-bottom:2px solid #172033}.watermark{position:fixed;inset:45% 5%;opacity:.1;transform:rotate(-20deg);font-size:36px;text-align:center}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:8px;text-align:left}pre{white-space:pre-wrap}</style></head><body><div class="watermark">${escapeHtml(packageSnapshot.watermark)}</div><header><h1>Vehicle 360 controlled print</h1><p>${escapeHtml(packageSnapshot.watermark)}</p></header><h2>${escapeHtml([vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" "))}</h2><table><tr><th>Vehicle</th><td>${escapeHtml(vehicle.vehicleNumber)}</td></tr><tr><th>VIN</th><td>${escapeHtml(vehicle.vin)}</td></tr><tr><th>Stock</th><td>${escapeHtml(vehicle.stockNumber)}</td></tr><tr><th>Status</th><td>${escapeHtml(vehicle.status)}</td></tr></table><h2>Operational package</h2><pre>${escapeHtml(JSON.stringify(packageSnapshot, null, 2))}</pre></body></html>`; }
