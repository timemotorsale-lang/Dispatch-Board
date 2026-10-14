export const TITLE_PREPARATION_OPERATION = "TITLE_DOCUMENT_PREPARATION";
export const TITLE_PREPARATION_POLICY_VERSION = "shop-recon.parallel-title-preparation/v1";

export const TITLE_PREPARATION_CHECKS = [
  { code: "IDENTITY_CONFIRMED", label: "Vehicle identity and inventory record confirmed" },
  { code: "OWNERSHIP_SOURCE_RECORDED", label: "Ownership source recorded" },
  { code: "TITLE_SOURCE_RECORDED", label: "Current title/document source recorded" },
  { code: "LIEN_PAYOFF_RECORDED", label: "Lien or payoff status recorded" },
  { code: "MISSING_DOCUMENTS_RECORDED", label: "Missing documents or no-gap result recorded" },
  { code: "HANDOFF_PREPARED", label: "Inventory review handoff prepared" },
] as const;

export type TitlePreparationChecklist = Record<(typeof TITLE_PREPARATION_CHECKS)[number]["code"], boolean>;

function object(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  if (value.trim().length > max) throw new Error(`${label} cannot exceed ${max} characters.`);
  return value.trim();
}
function optionalText(value: unknown, label: string, max: number) {
  return value == null || value === "" ? null : text(value, label, max);
}
function expectedVersion(value: unknown) {
  const version = Number(value);
  if (!Number.isInteger(version) || version < 1) throw new Error("Expected version must be a positive whole number.");
  return version;
}

export function emptyTitlePreparationChecklist(): TitlePreparationChecklist {
  return Object.fromEntries(TITLE_PREPARATION_CHECKS.map(item => [item.code, false])) as TitlePreparationChecklist;
}

export function normalizeTitlePreparationStart(value: unknown) {
  const raw = object(value, "Parallel title preparation");
  return {
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    reason: text(raw.reason, "Business reason", 500),
  };
}

export function normalizeTitlePreparationUpdate(value: unknown) {
  const raw = object(value, "Parallel title preparation update");
  const action = String(raw.action ?? "SAVE").toUpperCase();
  if (!["SAVE", "BLOCK", "RESUME", "SUBMIT_FOR_REVIEW"].includes(action)) throw new Error("Parallel operation action is invalid.");
  const checklistRaw = object(raw.checklist, "Preparation checklist");
  const checklist = Object.fromEntries(TITLE_PREPARATION_CHECKS.map(item => [item.code, checklistRaw[item.code] === true])) as TitlePreparationChecklist;
  const evidenceReferences = Array.isArray(raw.evidenceReferences)
    ? [...new Set(raw.evidenceReferences.map(item => String(item).trim()).filter(Boolean))]
    : [];
  if (evidenceReferences.length > 30) throw new Error("No more than 30 evidence references may be saved.");
  if (evidenceReferences.some(item => item.length > 500)) throw new Error("An evidence reference cannot exceed 500 characters.");
  const blockerNote = optionalText(raw.blockerNote, "Blocker note", 1_000);
  const handoffNote = optionalText(raw.handoffNote, "Inventory review handoff", 2_000);
  if (action === "BLOCK" && !blockerNote) throw new Error("A blocker note is required when blocking preparation work.");
  if (action === "SUBMIT_FOR_REVIEW") {
    if (TITLE_PREPARATION_CHECKS.some(item => !checklist[item.code])) throw new Error("Complete every preparation check before submitting for inventory review.");
    if (!evidenceReferences.length) throw new Error("At least one document or source reference is required before inventory review.");
    if (!handoffNote) throw new Error("Prepare the inventory review handoff before submitting.");
  }
  return {
    action: action as "SAVE" | "BLOCK" | "RESUME" | "SUBMIT_FOR_REVIEW",
    blockerNote,
    checklist,
    evidenceReferences,
    expectedVersion: expectedVersion(raw.expectedVersion),
    handoffNote,
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    reason: text(raw.reason, "Business reason", 500),
  };
}

export function evaluateTitlePreparationBinding(input: {
  operation: { inventoryUnitId: string | null; sourceScopeVersion: number; sourceVin: string | null; vehicleId: string };
  current: { inventoryUnitId: string | null; scopeVersion: number; vin: string | null; vehicleId: string; workLane: string };
}) {
  const reasons: string[] = [];
  if (input.current.workLane !== "INVENTORY_RECON") reasons.push("NOT_INVENTORY_RECON");
  if (input.operation.vehicleId !== input.current.vehicleId) reasons.push("VEHICLE_CHANGED");
  if (input.operation.sourceVin !== input.current.vin) reasons.push("VIN_CHANGED");
  if (input.operation.inventoryUnitId !== input.current.inventoryUnitId) reasons.push("INVENTORY_UNIT_CHANGED");
  if (input.operation.sourceScopeVersion !== input.current.scopeVersion) reasons.push("RECON_SCOPE_CHANGED");
  return { valid: reasons.length === 0, reasons, policyVersion: TITLE_PREPARATION_POLICY_VERSION };
}
