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
  if (JSON.stringify(data).length > 200000) throw new Error("Draft is too large.");
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}
