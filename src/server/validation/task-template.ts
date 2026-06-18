import { WorkflowArea } from "@prisma/client";

const taskTemplateCreateAllowedKeys = new Set([
  "title",
  "description",
  "workflowArea",
  "defaultDueTime",
  "requiresManagerApproval",
  "roleId",
  "dutyId",
  "isActive"
]);

const taskTemplateUpdateAllowedKeys = new Set(taskTemplateCreateAllowedKeys);
const workflowAreaValues = new Set(Object.values(WorkflowArea));
const defaultDueTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type NormalizedTaskTemplateCreateInput = {
  title: string;
  description: string | null;
  workflowArea: WorkflowArea;
  defaultDueTime: string;
  requiresManagerApproval: boolean;
  roleId: string | null;
  dutyId: string | null;
  isActive: boolean;
};

export type NormalizedTaskTemplateUpdateInput = Partial<NormalizedTaskTemplateCreateInput>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertTaskTemplateObject(value: unknown, message: string) {
  if (!isPlainObject(value)) {
    throw new Error(message);
  }

  return value;
}

function rejectUnknownKeys(value: Record<string, unknown>, allowedKeys: Set<string>) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Task template contains an unsupported field: "${key}".`);
    }
  }
}

function normalizeTitle(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Task templates require a title.");
  }

  const title = value.trim();

  if (!title) {
    throw new Error("Task templates require a title.");
  }

  return title;
}

function normalizeDescription(value: unknown, fieldName = "description") {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Task templates require ${fieldName} to be a string when provided.`);
  }

  const description = value.trim();

  return description || null;
}

function normalizeWorkflowArea(value: unknown) {
  if (typeof value !== "string" || !workflowAreaValues.has(value as WorkflowArea)) {
    throw new Error("Task templates require a valid workflow area.");
  }

  return value as WorkflowArea;
}

function normalizeDefaultDueTime(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Task templates require a valid default due time in HH:mm format.");
  }

  const defaultDueTime = value.trim();

  if (!defaultDueTimePattern.test(defaultDueTime)) {
    throw new Error("Task templates require a valid default due time in HH:mm format.");
  }

  return defaultDueTime;
}

function normalizeBoolean(value: unknown, message: string) {
  if (typeof value !== "boolean") {
    throw new Error(message);
  }

  return value;
}

function normalizeOptionalId(value: unknown, fieldName: "roleId" | "dutyId") {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Task templates require ${fieldName} to be a string or null when provided.`);
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

export function normalizeTaskTemplateCreateInput(value: unknown): NormalizedTaskTemplateCreateInput {
  const input = assertTaskTemplateObject(value, "Task template payload must be an object.");

  rejectUnknownKeys(input, taskTemplateCreateAllowedKeys);

  return {
    title: normalizeTitle(input.title),
    description: normalizeDescription(input.description) ?? null,
    workflowArea: normalizeWorkflowArea(input.workflowArea),
    defaultDueTime: normalizeDefaultDueTime(input.defaultDueTime),
    requiresManagerApproval: normalizeBoolean(
      input.requiresManagerApproval,
      "Task templates require requiresManagerApproval to be boolean."
    ),
    roleId: normalizeOptionalId(input.roleId, "roleId") ?? null,
    dutyId: normalizeOptionalId(input.dutyId, "dutyId") ?? null,
    isActive:
      input.isActive === undefined
        ? true
        : normalizeBoolean(input.isActive, "Task templates require isActive to be boolean when provided.")
  };
}

export function normalizeTaskTemplateUpdateInput(value: unknown): NormalizedTaskTemplateUpdateInput {
  const input = assertTaskTemplateObject(value, "Task template payload must be an object.");

  rejectUnknownKeys(input, taskTemplateUpdateAllowedKeys);

  if (Object.keys(input).length === 0) {
    throw new Error("Task template updates require at least one field.");
  }

  const normalizedInput: NormalizedTaskTemplateUpdateInput = {};

  if ("title" in input) {
    normalizedInput.title = normalizeTitle(input.title);
  }

  if ("description" in input) {
    normalizedInput.description = normalizeDescription(input.description) ?? null;
  }

  if ("workflowArea" in input) {
    normalizedInput.workflowArea = normalizeWorkflowArea(input.workflowArea);
  }

  if ("defaultDueTime" in input) {
    normalizedInput.defaultDueTime = normalizeDefaultDueTime(input.defaultDueTime);
  }

  if ("requiresManagerApproval" in input) {
    normalizedInput.requiresManagerApproval = normalizeBoolean(
      input.requiresManagerApproval,
      "Task templates require requiresManagerApproval to be boolean."
    );
  }

  if ("roleId" in input) {
    normalizedInput.roleId = normalizeOptionalId(input.roleId, "roleId") ?? null;
  }

  if ("dutyId" in input) {
    normalizedInput.dutyId = normalizeOptionalId(input.dutyId, "dutyId") ?? null;
  }

  if ("isActive" in input) {
    normalizedInput.isActive = normalizeBoolean(
      input.isActive,
      "Task templates require isActive to be boolean when provided."
    );
  }

  return normalizedInput;
}
