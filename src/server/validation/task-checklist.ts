import {
  TASK_CHECKLIST_ITEM_KIND_VALUES,
  type TaskChecklistItemKindValue
} from "@/lib/task-checklist-kind";

const taskChecklistCreateAllowedKeys = new Set(["kind", "label"]);
const taskChecklistUpdateAllowedKeys = new Set(["completed"]);
const taskChecklistKindValues = new Set(TASK_CHECKLIST_ITEM_KIND_VALUES);

export type NormalizedTaskChecklistCreateInput = {
  kind: TaskChecklistItemKindValue;
  label: string;
};

export type NormalizedTaskChecklistUpdateInput = {
  completed: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertChecklistObject(value: unknown, message: string) {
  if (!isPlainObject(value)) {
    throw new Error(message);
  }

  return value;
}

function rejectUnknownKeys(value: Record<string, unknown>, allowedKeys: Set<string>, prefix: string) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${prefix} contain an unsupported field: "${key}".`);
    }
  }
}

function normalizeKind(value: unknown) {
  if (typeof value !== "string" || !taskChecklistKindValues.has(value as TaskChecklistItemKindValue)) {
    throw new Error("Task checklist items require a valid kind.");
  }

  return value as TaskChecklistItemKindValue;
}

function normalizeLabel(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Task checklist items require label to be a string.");
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Task checklist items require a label.");
  }

  if (normalized.length > 120) {
    throw new Error("Task checklist items must be 120 characters or fewer.");
  }

  return normalized;
}

function normalizeCompleted(value: unknown) {
  if (typeof value !== "boolean") {
    throw new Error("Task checklist updates require completed to be a boolean.");
  }

  return value;
}

export function normalizeTaskChecklistCreateInput(
  value: unknown
): NormalizedTaskChecklistCreateInput {
  const input = assertChecklistObject(value, "Task checklist payload must be an object.");

  rejectUnknownKeys(input, taskChecklistCreateAllowedKeys, "Task checklist items");

  return {
    kind: normalizeKind(input.kind),
    label: normalizeLabel(input.label)
  };
}

export function normalizeTaskChecklistUpdateInput(
  value: unknown
): NormalizedTaskChecklistUpdateInput {
  const input = assertChecklistObject(value, "Task checklist update payload must be an object.");

  rejectUnknownKeys(input, taskChecklistUpdateAllowedKeys, "Task checklist updates");

  return {
    completed: normalizeCompleted(input.completed)
  };
}
