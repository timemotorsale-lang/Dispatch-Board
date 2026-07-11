import type { ConcernIntake, ConcernSource } from "@/server/concerns/concern-domain";

const allowedKeys = new Set([
  "customerReference",
  "daysOverdue",
  "description",
  "managerSensitive",
  "missingDocumentation",
  "moneyRisk",
  "repeatContactCount",
  "source",
  "title",
  "vehicleReference"
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Concern ${field} is required.`);
  const text = value.trim();
  if (text.length > maximum) throw new Error(`Concern ${field} must be ${maximum} characters or fewer.`);
  return text;
}

function optionalText(value: unknown, field: string, maximum: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`Concern ${field} must be text.`);
  const text = value.trim();
  if (text.length > maximum) throw new Error(`Concern ${field} must be ${maximum} characters or fewer.`);
  return text || null;
}

function nonNegativeInteger(value: unknown, field: string) {
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 3650) {
    throw new Error(`Concern ${field} must be a non-negative whole number.`);
  }
  return Number(value);
}

function optionalBoolean(value: unknown, field: string) {
  if (value === undefined) return false;
  if (typeof value !== "boolean") throw new Error(`Concern ${field} must be true or false.`);
  return value;
}

export function normalizeConcernIntake(value: unknown): ConcernIntake {
  if (!isObject(value)) throw new Error("Concern intake must be an object.");
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) throw new Error(`Concern intake contains an unsupported field: "${key}".`);
  }
  const source = value.source === undefined ? "MANAGER" : value.source;
  if (source !== "MANAGER" && source !== "QUICK_LOG") throw new Error("Concern source is not supported.");
  return {
    title: requiredText(value.title, "title", 180),
    description: requiredText(value.description, "description", 5000),
    customerReference: optionalText(value.customerReference, "customerReference", 240),
    vehicleReference: optionalText(value.vehicleReference, "vehicleReference", 240),
    daysOverdue: nonNegativeInteger(value.daysOverdue, "daysOverdue"),
    repeatContactCount: nonNegativeInteger(value.repeatContactCount, "repeatContactCount"),
    managerSensitive: optionalBoolean(value.managerSensitive, "managerSensitive"),
    moneyRisk: optionalBoolean(value.moneyRisk, "moneyRisk"),
    missingDocumentation: optionalBoolean(value.missingDocumentation, "missingDocumentation"),
    source: source as ConcernSource
  };
}
