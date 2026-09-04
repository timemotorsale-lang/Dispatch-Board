import { TaskStatus, TaskTemplatePriority, WorkflowArea } from "@prisma/client";

import { normalizeBoardDate } from "@/server/validation/board-date";

const taskCreateAllowedKeys = new Set([
  "assignedUserId",
  "appointmentAutomationReasonNotes",
  "appointmentAutomationTriggerCode",
  "blockerReason",
  "boardDate",
  "customerReference",
  "collaboratorIds",
  "conversionContext",
  "description",
  "dueAt",
  "intakeMetadata",
  "priority",
  "requiresManagerApproval",
  "status",
  "title",
  "vehicleReference",
  "workflowArea"
]);
const taskStatusValues = new Set(Object.values(TaskStatus));
const workflowAreaValues = new Set(Object.values(WorkflowArea));
const taskPriorityValues = new Set(Object.values(TaskTemplatePriority));

export type NormalizedTaskIntakeMetadata = {
  channel: string;
  expectedOutcome: string;
  intakeType: string;
  requiredUpdates: string[];
};

export type NormalizedTaskConversionContext = {
  category?: string;
  company?: string;
  originText?: string;
  person?: string;
  sourceId?: string;
  sourceKind?: string;
};

export type NormalizedTaskCreateInput = {
  assignedUserId: string;
  collaboratorIds: string[];
  appointmentAutomationReasonNotes?: string;
  appointmentAutomationTriggerCode?: string;
  blockerReason?: string;
  boardDate: string;
  customerReference?: string;
  description: string;
  dueAt: Date;
  conversionContext?: NormalizedTaskConversionContext;
  intakeMetadata?: NormalizedTaskIntakeMetadata;
  priority: TaskTemplatePriority;
  requiresManagerApproval: boolean;
  status: TaskStatus;
  title: string;
  vehicleReference?: string;
  workflowArea: WorkflowArea;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertTaskCreateObject(value: unknown) {
  if (!isPlainObject(value)) {
    throw new Error("Task creation payload must be an object.");
  }

  return value;
}

function rejectUnknownKeys(value: Record<string, unknown>) {
  for (const key of Object.keys(value)) {
    if (!taskCreateAllowedKeys.has(key)) {
      throw new Error(`Task creation contains an unsupported field: "${key}".`);
    }
  }
}

function normalizeRequiredText(value: unknown, errorMessage: string) {
  if (typeof value !== "string") {
    throw new Error(errorMessage);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(errorMessage);
  }

  return normalizedValue;
}

function normalizeOptionalText(value: unknown, fieldName: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Task creation requires ${fieldName} to be a string when provided.`);
  }

  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function normalizeBoardDateInput(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Task creation requires a board date.");
  }

  return normalizeBoardDate(value);
}

function normalizeDueAt(value: unknown) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Task creation requires dueAt to be a valid timestamp.");
    }

    return value;
  }

  if (typeof value !== "string") {
    throw new Error("Task creation requires a due time.");
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("Task creation requires a due time.");
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Task creation requires dueAt to be a valid timestamp.");
  }

  return parsedDate;
}

function normalizeStatus(value: unknown) {
  if (value === undefined) {
    return TaskStatus.NOT_STARTED;
  }

  if (typeof value !== "string" || !taskStatusValues.has(value as TaskStatus)) {
    throw new Error("Task creation requires a valid status.");
  }

  return value as TaskStatus;
}

function normalizeWorkflowArea(value: unknown) {
  if (typeof value !== "string" || !workflowAreaValues.has(value as WorkflowArea)) {
    throw new Error("Task creation requires a valid workflowArea.");
  }

  return value as WorkflowArea;
}

function normalizeBoolean(value: unknown, errorMessage: string) {
  if (value === undefined) {
    return false;
  }

  if (typeof value !== "boolean") {
    throw new Error(errorMessage);
  }

  return value;
}

function normalizeCollaboratorIds(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Task creation requires collaboratorIds to be an array when provided.");
  const ids = value.map((item) => normalizeRequiredText(item, "Every collaborator id must be a non-empty string."));
  if (ids.length > 25) throw new Error("A task can have at most 25 collaborators.");
  if (new Set(ids).size !== ids.length) throw new Error("Task collaborators cannot contain duplicates.");
  return ids;
}

function normalizePriority(value: unknown) {
  if (value === undefined) return TaskTemplatePriority.MEDIUM;
  if (typeof value !== "string" || !taskPriorityValues.has(value as TaskTemplatePriority)) {
    throw new Error("Task creation requires a valid priority.");
  }
  return value as TaskTemplatePriority;
}

function normalizeIntakeMetadata(value: unknown) {
  if (value === undefined) return undefined;
  const metadata = assertTaskCreateObject(value);
  const allowedKeys = new Set(["channel", "expectedOutcome", "intakeType", "requiredUpdates"]);
  for (const key of Object.keys(metadata)) {
    if (!allowedKeys.has(key)) throw new Error(`Task intake metadata contains an unsupported field: "${key}".`);
  }
  if (!Array.isArray(metadata.requiredUpdates) || metadata.requiredUpdates.length === 0 || metadata.requiredUpdates.length > 12) {
    throw new Error("Task intake metadata requires between 1 and 12 required updates.");
  }
  return {
    channel: normalizeRequiredText(metadata.channel, "Task intake metadata requires a channel."),
    expectedOutcome: normalizeRequiredText(metadata.expectedOutcome, "Task intake metadata requires an expected outcome."),
    intakeType: normalizeRequiredText(metadata.intakeType, "Task intake metadata requires an intake type."),
    requiredUpdates: metadata.requiredUpdates.map((item) => normalizeRequiredText(item, "Every required update must be a non-empty string."))
  };
}

function normalizeConversionContext(value: unknown) {
  if (value === undefined) return undefined;
  const context = assertTaskCreateObject(value);
  const allowedKeys = new Set(["category", "company", "originText", "person", "sourceId", "sourceKind"]);
  for (const key of Object.keys(context)) {
    if (!allowedKeys.has(key)) throw new Error(`Task conversion context contains an unsupported field: "${key}".`);
  }

  const normalizedContext: NormalizedTaskConversionContext = {};
  for (const key of allowedKeys) {
    const normalizedValue = normalizeOptionalText(context[key], key);
    if (normalizedValue) {
      normalizedContext[key as keyof NormalizedTaskConversionContext] = normalizedValue;
    }
  }

  return Object.keys(normalizedContext).length ? normalizedContext : undefined;
}

function intakeTypeRequiresCustomerOrVehicle(value: string) {
  const normalizedValue = value.toLocaleLowerCase();

  return /advisor|appointment|customer|repair|service|vehicle|vin/.test(normalizedValue);
}

export function normalizeTaskCreateInput(value: unknown): NormalizedTaskCreateInput {
  const input = assertTaskCreateObject(value);

  rejectUnknownKeys(input);

  const normalizedInput: NormalizedTaskCreateInput = {
    assignedUserId: normalizeRequiredText(
      input.assignedUserId,
      "Task creation requires an assigned user."
    ),
    collaboratorIds: normalizeCollaboratorIds(input.collaboratorIds),
    boardDate: normalizeBoardDateInput(input.boardDate),
    description: normalizeOptionalText(input.description, "description") ?? "",
    dueAt: normalizeDueAt(input.dueAt),
    priority: normalizePriority(input.priority),
    requiresManagerApproval: normalizeBoolean(
      input.requiresManagerApproval,
      "Task creation requires requiresManagerApproval to be boolean when provided."
    ),
    status: normalizeStatus(input.status),
    title: normalizeRequiredText(input.title, "Task creation requires a title."),
    workflowArea: normalizeWorkflowArea(input.workflowArea)
  };

  const intakeMetadata = normalizeIntakeMetadata(input.intakeMetadata);
  const conversionContext = normalizeConversionContext(input.conversionContext);
  if (conversionContext) {
    normalizedInput.conversionContext = conversionContext;
  }

  if (intakeMetadata) {
    if (normalizedInput.title.length < 8) throw new Error("Task intake requires an executable title of at least 8 characters.");
    if (normalizedInput.description.length < 16) throw new Error("Task intake requires a clear brief of at least 16 characters.");
    if (intakeMetadata.expectedOutcome.length < 20) throw new Error("Task intake requires an expected outcome of at least 20 characters.");
    if (intakeTypeRequiresCustomerOrVehicle(intakeMetadata.intakeType) && !normalizeOptionalText(input.customerReference, "customerReference") && !normalizeOptionalText(input.vehicleReference, "vehicleReference")) {
      throw new Error("Task intake requires customer or vehicle context for this intake type.");
    }
    normalizedInput.intakeMetadata = intakeMetadata;
  }

  const blockerReason = normalizeOptionalText(input.blockerReason, "blockerReason");

  if (blockerReason) {
    normalizedInput.blockerReason = blockerReason;
  }

  const vehicleReference = normalizeOptionalText(input.vehicleReference, "vehicleReference");

  if (vehicleReference) {
    normalizedInput.vehicleReference = vehicleReference;
  }

  const customerReference = normalizeOptionalText(input.customerReference, "customerReference");

  if (customerReference) {
    normalizedInput.customerReference = customerReference;
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

  if (normalizedInput.status === TaskStatus.BLOCKED && !normalizedInput.blockerReason) {
    throw new Error("Blocked tasks require a blocker reason.");
  }

  return normalizedInput;
}
