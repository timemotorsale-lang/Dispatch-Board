import { TaskStatus } from "@prisma/client";

const taskStatusUpdateAllowedKeys = new Set([
  "status",
  "blockerReason",
  "updateFields",
  "appointmentAutomationTriggerCode",
  "appointmentAutomationReasonNotes"
]);
const taskStatusValues = new Set(Object.values(TaskStatus));

export type NormalizedTaskStatusUpdateInput = {
  status: TaskStatus;
  blockerReason?: string;
  updateFields?: Record<string, string | boolean>;
  appointmentAutomationTriggerCode?: string;
  appointmentAutomationReasonNotes?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertTaskStatusObject(value: unknown) {
  if (!isPlainObject(value)) {
    throw new Error("Task status payload must be an object.");
  }

  return value;
}

function rejectUnknownKeys(value: Record<string, unknown>) {
  for (const key of Object.keys(value)) {
    if (!taskStatusUpdateAllowedKeys.has(key)) {
      throw new Error(`Task status updates contain an unsupported field: "${key}".`);
    }
  }
}

function normalizeStatus(value: unknown) {
  if (typeof value !== "string" || !taskStatusValues.has(value as TaskStatus)) {
    throw new Error("Task status updates require a valid status.");
  }

  return value as TaskStatus;
}

function normalizeOptionalBlockerReason(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error("Task status updates require blockerReason to be a string when provided.");
  }

  return value.trim();
}

function normalizeUpdateFields(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new Error("Task status updates require updateFields to be an object when provided.");
  }

  const normalizedEntries: Array<[string, string | boolean]> = [];

  for (const [key, fieldValue] of Object.entries(value)) {
    const normalizedKey = key.trim();

    if (!normalizedKey) {
      throw new Error("Task status updates require updateFields keys to be non-empty strings.");
    }

    if (fieldValue === null || fieldValue === undefined) {
      continue;
    }

    if (typeof fieldValue === "boolean") {
      normalizedEntries.push([normalizedKey, fieldValue]);
      continue;
    }

    if (typeof fieldValue === "string") {
      const normalizedValue = fieldValue.trim();
      if (normalizedValue) {
        normalizedEntries.push([normalizedKey, normalizedValue]);
      }
      continue;
    }

    throw new Error(
      `Task status updates require updateFields.${normalizedKey} to be a string or boolean.`
    );
  }

  return Object.fromEntries(normalizedEntries);
}

function normalizeOptionalText(value: unknown, fieldName: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Task status updates require ${fieldName} to be a string when provided.`);
  }

  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

export function normalizeTaskStatusUpdateInput(value: unknown): NormalizedTaskStatusUpdateInput {
  const input = assertTaskStatusObject(value);

  rejectUnknownKeys(input);

  const normalizedInput: NormalizedTaskStatusUpdateInput = {
    status: normalizeStatus(input.status)
  };

  const blockerReason = normalizeOptionalBlockerReason(input.blockerReason);

  if (blockerReason) {
    normalizedInput.blockerReason = blockerReason;
  }

  const updateFields = normalizeUpdateFields(input.updateFields);

  if (updateFields && Object.keys(updateFields).length > 0) {
    normalizedInput.updateFields = updateFields;
  }

  const appointmentAutomationTriggerCode = normalizeOptionalText(
    input.appointmentAutomationTriggerCode,
    "appointmentAutomationTriggerCode"
  );

  if (appointmentAutomationTriggerCode) {
    normalizedInput.appointmentAutomationTriggerCode =
      appointmentAutomationTriggerCode.toUpperCase();
  }

  const appointmentAutomationReasonNotes = normalizeOptionalText(
    input.appointmentAutomationReasonNotes,
    "appointmentAutomationReasonNotes"
  );

  if (appointmentAutomationReasonNotes) {
    normalizedInput.appointmentAutomationReasonNotes = appointmentAutomationReasonNotes;
  }

  return normalizedInput;
}
