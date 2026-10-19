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
  "collaboratorRequests",
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
  contextOmitted: boolean;
  enterpriseControls?: {
    escalationPath: string;
    evidenceRequirement: string;
    reviewCadence: string;
    slaPolicy: string;
    visibility: string;
  };
  expectedOutcome: string;
  intakeType: string;
  requiredUpdates: string[];
  taskTools?: {
    checklistItems: string[];
    subtaskTemplates: string[];
    uploadedEvidence: string[];
    uploadRequirements: string[];
  };
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
  collaboratorRequests: Array<{ userId: string; collaborationScope: string; capacityRequested?: string }>;
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

function normalizeStringList(value: unknown, fieldName: string, maxLength = 25) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`Task intake ${fieldName} must be an array when provided.`);
  const items = value.map((item) => normalizeRequiredText(item, `Every ${fieldName} item must be a non-empty string.`));
  if (items.length > maxLength) throw new Error(`Task intake ${fieldName} can contain at most ${maxLength} items.`);
  if (new Set(items).size !== items.length) throw new Error(`Task intake ${fieldName} cannot contain duplicates.`);
  return items;
}

function normalizeCollaboratorRequests(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("Task creation requires collaboratorRequests to be an array when provided.");
  const requests = value.map((entry) => {
    if (!isPlainObject(entry)) throw new Error("Every collaborator request must be an object.");
    const allowedKeys = new Set(["userId", "collaborationScope", "capacityRequested"]);
    for (const key of Object.keys(entry)) {
      if (!allowedKeys.has(key)) throw new Error(`Task collaborator request contains an unsupported field: "${key}".`);
    }
    const collaborationScope = normalizeRequiredText(entry.collaborationScope, "Every collaborator request needs a collaboration scope.");
    if (collaborationScope.length > 600) throw new Error("Collaboration scope must be 600 characters or fewer.");
    const capacityRequested = normalizeOptionalText(entry.capacityRequested, "capacityRequested");
    if (capacityRequested && capacityRequested.length > 240) throw new Error("Collaboration capacity must be 240 characters or fewer.");
    return {
      userId: normalizeRequiredText(entry.userId, "Every collaborator id must be a non-empty string."),
      collaborationScope,
      ...(capacityRequested ? { capacityRequested } : {})
    };
  });
  if (requests.length > 25) throw new Error("A task can have at most 25 collaborators.");
  if (new Set(requests.map((request) => request.userId)).size !== requests.length) throw new Error("Task collaborators cannot contain duplicates.");
  return requests;
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
  const allowedKeys = new Set(["channel", "contextOmitted", "enterpriseControls", "expectedOutcome", "intakeType", "requiredUpdates", "taskTools"]);
  for (const key of Object.keys(metadata)) {
    if (!allowedKeys.has(key)) throw new Error(`Task intake metadata contains an unsupported field: "${key}".`);
  }
  if (!Array.isArray(metadata.requiredUpdates) || metadata.requiredUpdates.length === 0 || metadata.requiredUpdates.length > 12) {
    throw new Error("Task intake metadata requires between 1 and 12 required updates.");
  }
  const normalizedMetadata: NormalizedTaskIntakeMetadata = {
    channel: normalizeRequiredText(metadata.channel, "Task intake metadata requires a channel."),
    contextOmitted: normalizeBoolean(
      metadata.contextOmitted,
      "Task intake metadata requires contextOmitted to be boolean when provided."
    ),
    expectedOutcome: normalizeRequiredText(metadata.expectedOutcome, "Task intake metadata requires an expected outcome."),
    intakeType: normalizeRequiredText(metadata.intakeType, "Task intake metadata requires an intake type."),
    requiredUpdates: metadata.requiredUpdates.map((item) => normalizeRequiredText(item, "Every required update must be a non-empty string."))
  };
  if (metadata.enterpriseControls !== undefined) {
    const controls = assertTaskCreateObject(metadata.enterpriseControls);
    const controlKeys = new Set(["escalationPath", "evidenceRequirement", "reviewCadence", "slaPolicy", "visibility"]);
    for (const key of Object.keys(controls)) {
      if (!controlKeys.has(key)) throw new Error(`Task intake enterprise controls contain an unsupported field: "${key}".`);
    }
    normalizedMetadata.enterpriseControls = {
      escalationPath: normalizeRequiredText(controls.escalationPath, "Task intake enterprise controls require an escalation path."),
      evidenceRequirement: normalizeRequiredText(controls.evidenceRequirement, "Task intake enterprise controls require an evidence requirement."),
      reviewCadence: normalizeRequiredText(controls.reviewCadence, "Task intake enterprise controls require a review cadence."),
      slaPolicy: normalizeRequiredText(controls.slaPolicy, "Task intake enterprise controls require an SLA policy."),
      visibility: normalizeRequiredText(controls.visibility, "Task intake enterprise controls require visibility.")
    };
  }
  if (metadata.taskTools !== undefined) {
    const taskTools = assertTaskCreateObject(metadata.taskTools);
    const taskToolKeys = new Set(["checklistItems", "subtaskTemplates", "uploadedEvidence", "uploadRequirements"]);
    for (const key of Object.keys(taskTools)) {
      if (!taskToolKeys.has(key)) throw new Error(`Task intake task tools contain an unsupported field: "${key}".`);
    }
    normalizedMetadata.taskTools = {
      checklistItems: normalizeStringList(taskTools.checklistItems, "checklistItems", 40),
      subtaskTemplates: normalizeStringList(taskTools.subtaskTemplates, "subtaskTemplates", 20),
      uploadedEvidence: normalizeStringList(taskTools.uploadedEvidence, "uploadedEvidence", 20),
      uploadRequirements: normalizeStringList(taskTools.uploadRequirements, "uploadRequirements", 20)
    };
  }
  return normalizedMetadata;
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

  const collaboratorRequests = normalizeCollaboratorRequests(input.collaboratorRequests);
  const collaboratorIds = collaboratorRequests?.map((request) => request.userId) ?? normalizeCollaboratorIds(input.collaboratorIds);
  const normalizedInput: NormalizedTaskCreateInput = {
    assignedUserId: normalizeRequiredText(
      input.assignedUserId,
      "Task creation requires an assigned user."
    ),
    collaboratorIds,
    collaboratorRequests: collaboratorRequests ?? collaboratorIds.map((userId) => ({ userId, collaborationScope: "" })),
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
    if (normalizedInput.description.length < 16) throw new Error("Task intake requires clear task details of at least 16 characters.");
    if (intakeMetadata.expectedOutcome.length < 20) throw new Error("Task intake requires an expected outcome of at least 20 characters.");
    if (intakeTypeRequiresCustomerOrVehicle(intakeMetadata.intakeType) && !intakeMetadata.contextOmitted && !normalizeOptionalText(input.customerReference, "customerReference") && !normalizeOptionalText(input.vehicleReference, "vehicleReference")) {
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
