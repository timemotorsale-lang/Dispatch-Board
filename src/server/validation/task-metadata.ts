import { WorkflowArea } from "@prisma/client";

const taskMetadataAllowedKeys = new Set([
  "customerReference",
  "description",
  "dueAt",
  "title",
  "vehicleReference",
  "workflowArea"
]);
const workflowAreaValues = new Set(Object.values(WorkflowArea));

export type NormalizedTaskMetadataUpdateInput = {
  customerReference?: string | null;
  description?: string;
  dueAt?: Date;
  title?: string;
  vehicleReference?: string | null;
  workflowArea?: WorkflowArea;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertTaskMetadataObject(value: unknown) {
  if (!isPlainObject(value)) {
    throw new Error("Task metadata payload must be an object.");
  }

  return value;
}

function rejectUnknownKeys(value: Record<string, unknown>) {
  for (const key of Object.keys(value)) {
    if (!taskMetadataAllowedKeys.has(key)) {
      throw new Error(`Task metadata updates contain an unsupported field: "${key}".`);
    }
  }
}

function normalizeDescription(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("Task metadata updates require description to be a string when provided.");
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length > 2000) {
    throw new Error("Task metadata description must be 2000 characters or fewer.");
  }

  return normalizedValue;
}

function normalizeTitle(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("Task metadata updates require title to be a string when provided.");
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("Task title is required.");
  }

  if (normalizedValue.length > 160) {
    throw new Error("Task metadata title must be 160 characters or fewer.");
  }

  return normalizedValue;
}

function normalizeOptionalReference(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Task metadata updates require ${fieldName} to be a string when provided.`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length > 120) {
    throw new Error(`Task metadata ${fieldName} must be 120 characters or fewer.`);
  }

  return normalizedValue || null;
}

function normalizeDueAt(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("Task metadata updates require dueAt to be a valid timestamp.");
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("Task metadata updates require dueAt to be a valid timestamp.");
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Task metadata updates require dueAt to be a valid timestamp.");
  }

  return parsedDate;
}

function normalizeWorkflowArea(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !workflowAreaValues.has(value as WorkflowArea)) {
    throw new Error("Task metadata updates require workflowArea to be a valid execution path.");
  }

  return value as WorkflowArea;
}

export function normalizeTaskMetadataUpdateInput(value: unknown): NormalizedTaskMetadataUpdateInput {
  const input = assertTaskMetadataObject(value);

  rejectUnknownKeys(input);

  const normalizedInput: NormalizedTaskMetadataUpdateInput = {};

  const title = normalizeTitle(input.title);
  if (title !== undefined) {
    normalizedInput.title = title;
  }

  const description = normalizeDescription(input.description);
  if (description !== undefined) {
    normalizedInput.description = description;
  }

  const vehicleReference = normalizeOptionalReference(input.vehicleReference, "vehicleReference");
  if (vehicleReference !== undefined) {
    normalizedInput.vehicleReference = vehicleReference;
  }

  const customerReference = normalizeOptionalReference(input.customerReference, "customerReference");
  if (customerReference !== undefined) {
    normalizedInput.customerReference = customerReference;
  }

  const dueAt = normalizeDueAt(input.dueAt);
  if (dueAt !== undefined) {
    normalizedInput.dueAt = dueAt;
  }

  const workflowArea = normalizeWorkflowArea(input.workflowArea);
  if (workflowArea !== undefined) {
    normalizedInput.workflowArea = workflowArea;
  }

  if (Object.keys(normalizedInput).length === 0) {
    throw new Error("Task metadata updates require at least one field.");
  }

  return normalizedInput;
}
