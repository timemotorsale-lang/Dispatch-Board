import { validateManualReview } from "./estimate-review";
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function strings(row: Record<string, unknown>, keys: string[]) {
  return keys.every(key => typeof row[key] === "string");
}
function stringArrays(row: Record<string, unknown>, keys: string[]) {
  return keys.every(key => Array.isArray(row[key]) && row[key].every(item => typeof item === "string"));
}
export function diagnosticDraftPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid draft payload.");
  const data = value as Record<string, unknown>;
  if (data.laborReview !== undefined) validateManualReview(data.laborReview);
  for (const key of ["labor", "parts", "evidence"]) {
    if (!Array.isArray(data[key]) || data[key].length > 300) throw new Error(`Invalid draft ${key}.`);
  }
  if (!object(data.manual) || !strings(data.manual, ["customer", "vehicle", "vin", "concern"])) throw new Error("Vehicle details are required.");
  if (data.ro !== null && (!object(data.ro) || !strings(data.ro, ["id", "customer", "concern", "repairOrderNumber", "openedAt"]) || !object(data.ro.vehicle) || !strings(data.ro.vehicle, ["label", "vin"]))) throw new Error("Invalid repair order details.");
  for (const row of data.labor as unknown[]) {
    if (!object(row) || !strings(row, ["id", "rowId", "title", "component", "operation", "position", "subsystem", "system"]) || !stringArrays(row, ["aliases", "concernExamples", "included", "requiredAddOns"]) || typeof row.hours !== "number" || !Number.isFinite(row.hours) || row.hours < 0) throw new Error("Invalid draft labor line.");
  }
  for (const row of data.parts as unknown[]) {
    if (!object(row) || !strings(row, ["id", "laborRowId", "name", "number"]) || typeof row.quantity !== "number" || !Number.isFinite(row.quantity) || row.quantity <= 0 || typeof row.unitPrice !== "number" || !Number.isFinite(row.unitPrice) || row.unitPrice < 0) throw new Error("Invalid draft part line.");
  }
  for (const row of data.evidence as unknown[]) {
    if (!object(row) || !strings(row, ["accessLevel", "attachedTo", "category", "fileName", "note", "status"])) throw new Error("Invalid draft evidence.");
  }
  if (data.attempt !== null && (!object(data.attempt) || !strings(data.attempt, ["fingerprint"]) || !object(data.attempt.body))) throw new Error("Invalid estimate attempt.");
  if (data.clinical !== undefined) {
    if (!object(data.clinical) || Object.keys(data.clinical).length > 20) throw new Error("Invalid clinical drafts.");
    for (const [caseId, form] of Object.entries(data.clinical)) {
      if (!/^[\w-]{1,100}$/.test(caseId) || !object(form) || !strings(form, ["mode", "statement", "conditions", "quantity", "value", "unit", "group", "instrument", "calibration", "referenceMin", "referenceMax", "referenceSource", "evidenceObjectId", "purpose"])) throw new Error("Invalid clinical draft fields.");
      if (!["observations", "measurements", "evidence"].includes(String(form.mode))) throw new Error("Invalid evidence record type.");
      if (Object.values(form).some(value => typeof value === "string" && value.length > 2000)) throw new Error("Clinical draft field is too long.");
      if (form.pending !== undefined && (!object(form.pending) || !["observations", "measurements", "evidence"].includes(String(form.pending.endpoint)) || !object(form.pending.body))) throw new Error("Invalid pending evidence request.");
    }
  }
  if (JSON.stringify(data).length > 200000) throw new Error("Draft is too large.");
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}
