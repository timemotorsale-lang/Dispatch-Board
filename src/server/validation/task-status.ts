import { TaskStatus } from "@prisma/client";

const taskStatusUpdateAllowedKeys = new Set([
  "status",
  "blockerReason",
  "blockerPlan",
  "progressNote",
  "nextCheckpointAt",
  "updateFields",
  "appointmentAutomationTriggerCode",
  "appointmentAutomationReasonNotes"
]);
const taskStatusValues = new Set(Object.values(TaskStatus));

export type NormalizedTaskStatusUpdateInput = {
  status: TaskStatus;
  blockerReason?: string;
  blockerPlan?: {
    unblockAction: string;
    owner: string;
    reviewAt: string;
    escalationAt: string;
  };
  progressNote?: string;
  nextCheckpointAt?: string;
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

function normalizeOptionalDate(value: unknown, fieldName: string) {
  const text = normalizeOptionalText(value, fieldName);
  if (!text) return undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Task status updates require ${fieldName} to be a valid date and time.`);
  }
  return date.toISOString();
}

function normalizeBlockerPlan(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) {
    throw new Error("Task status updates require blockerPlan to be an object when provided.");
  }

  const allowedKeys = new Set(["unblockAction", "owner", "reviewAt", "escalationAt"]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Task blocker plans contain an unsupported field: "${key}".`);
    }
  }

  const unblockAction = normalizeOptionalText(value.unblockAction, "blockerPlan.unblockAction");
  const owner = normalizeOptionalText(value.owner, "blockerPlan.owner");
  const reviewAt = normalizeOptionalDate(value.reviewAt, "blockerPlan.reviewAt");
  const escalationAt = normalizeOptionalDate(value.escalationAt, "blockerPlan.escalationAt");
  if (!unblockAction || !owner || !reviewAt || !escalationAt) {
    throw new Error("Blocked tasks require an unblock action, responsible person, review time, and escalation deadline.");
  }
  if (new Date(escalationAt) < new Date(reviewAt)) {
    throw new Error("The blocker escalation deadline must be at or after the review time.");
  }

  return { unblockAction, owner, reviewAt, escalationAt };
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

  const blockerPlan = normalizeBlockerPlan(input.blockerPlan);
  if (blockerPlan) {
    normalizedInput.blockerPlan = blockerPlan;
  }

  const progressNote = normalizeOptionalText(input.progressNote, "progressNote");
  if (progressNote) {
    normalizedInput.progressNote = progressNote;
  }

  const nextCheckpointAt = normalizeOptionalDate(input.nextCheckpointAt, "nextCheckpointAt");
  if (nextCheckpointAt) {
    normalizedInput.nextCheckpointAt = nextCheckpointAt;
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
