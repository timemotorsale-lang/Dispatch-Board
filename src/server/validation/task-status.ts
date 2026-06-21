import { TaskStatus } from "@prisma/client";

const taskStatusUpdateAllowedKeys = new Set(["status", "blockerReason"]);
const taskStatusValues = new Set(Object.values(TaskStatus));

export type NormalizedTaskStatusUpdateInput = {
  status: TaskStatus;
  blockerReason?: string;
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

  return normalizedInput;
}
