import { TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canUpdateAssignedWork, isManager } from "@/server/policies/access";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import { runTaskAppointmentAutomationForTaskEvent } from "@/server/services/task-appointment-automation-service";
import {
  createTaskStatusRepository,
  type TaskStatusRepository
} from "@/server/repositories/task-status-repository";
import {
  normalizeTaskStatusUpdateInput,
  type NormalizedTaskStatusUpdateInput
} from "@/server/validation/task-status";
import type {
  TaskTemplateCompletionCriteria,
  TaskTemplateRequiredUpdateField
} from "@/server/validation/task-template";
import { getStaffExecutionFlags, type StaffExecutionFlags } from "@/lib/staff-execution-flags";

export type TaskStatusUpdateResult = {
  id: string;
  status: TaskStatus;
  blockerReason: string | null;
  updateFieldValues?: Record<string, string | boolean>;
  updatedAt: string;
};

const approvalRequiredCompletionError =
  "Approval-required tasks must move through Ready for Review before Completed.";

function normalizeTaskId(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  return normalizedTaskId;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStoredUpdateFieldValues(value: unknown) {
  if (!isPlainObject(value)) {
    return {} as Record<string, string | boolean>;
  }

  const normalizedEntries: Array<[string, string | boolean]> = [];

  for (const [key, fieldValue] of Object.entries(value)) {
    if (typeof fieldValue === "boolean") {
      normalizedEntries.push([key, fieldValue]);
      continue;
    }

    if (typeof fieldValue === "string") {
      const normalizedValue = fieldValue.trim();

      if (normalizedValue) {
        normalizedEntries.push([key, normalizedValue]);
      }
    }
  }

  return Object.fromEntries(normalizedEntries);
}

function normalizeTemplateRequiredUpdateFields(snapshot: unknown): TaskTemplateRequiredUpdateField[] {
  if (!isPlainObject(snapshot) || !Array.isArray(snapshot.requiredUpdateFields)) {
    return [];
  }

  return snapshot.requiredUpdateFields.flatMap((entry) => {
    if (!isPlainObject(entry) || typeof entry.key !== "string" || typeof entry.label !== "string") {
      return [];
    }

    if (
      entry.type !== "short_text" &&
      entry.type !== "long_text" &&
      entry.type !== "single_select" &&
      entry.type !== "boolean"
    ) {
      return [];
    }

    return [
      {
        key: entry.key,
        label: entry.label,
        type: entry.type,
        required: entry.required !== false,
        helpText: typeof entry.helpText === "string" ? entry.helpText : null,
        ...(Array.isArray(entry.options) &&
        entry.options.every((option) => typeof option === "string" && option.trim())
          ? { options: entry.options.map((option) => option.trim()) }
          : {})
      } satisfies TaskTemplateRequiredUpdateField
    ];
  });
}

function normalizeTemplateCompletionCriteria(snapshot: unknown): TaskTemplateCompletionCriteria | null {
  if (!isPlainObject(snapshot) || !isPlainObject(snapshot.completionCriteria)) {
    return null;
  }

  const criteria = snapshot.completionCriteria;

  if (
    typeof criteria.mode !== "string" ||
    !Array.isArray(criteria.requiredChecklistKeys) ||
    !Array.isArray(criteria.requiredFieldKeys)
  ) {
    return null;
  }

  return {
    mode:
      criteria.mode === "manual" ||
      criteria.mode === "checklist" ||
      criteria.mode === "update_fields" ||
      criteria.mode === "checklist_and_update_fields"
        ? criteria.mode
        : "manual",
    requiredChecklistKeys: criteria.requiredChecklistKeys.filter((value): value is string => typeof value === "string"),
    requiredFieldKeys: criteria.requiredFieldKeys.filter((value): value is string => typeof value === "string")
  };
}

function mergeUpdateFieldValues(
  existingValues: unknown,
  incomingValues: Record<string, string | boolean> | undefined
) {
  return {
    ...normalizeStoredUpdateFieldValues(existingValues),
    ...(incomingValues ?? {})
  };
}

function validateIncomingUpdateFieldsAgainstTemplate(
  requiredUpdateFields: TaskTemplateRequiredUpdateField[],
  incomingValues: Record<string, string | boolean> | undefined
) {
  if (!incomingValues) {
    return;
  }

  const fieldsByKey = new Map(requiredUpdateFields.map((field) => [field.key, field]));

  for (const [key, value] of Object.entries(incomingValues)) {
    const field = fieldsByKey.get(key);

    if (!field) {
      throw new Error(`Task update field "${key}" is not allowed for this task.`);
    }

    if ((field.type === "short_text" || field.type === "long_text" || field.type === "single_select") && typeof value !== "string") {
      throw new Error(`Task update field "${field.label}" requires text input.`);
    }

    if (field.type === "boolean" && typeof value !== "boolean") {
      throw new Error(`Task update field "${field.label}" requires a yes/no value.`);
    }

    if (field.type === "single_select" && field.options && !field.options.includes(value as string)) {
      throw new Error(`Task update field "${field.label}" must use one of the allowed options.`);
    }
  }
}

function shouldEnforceRequiredUpdateFields(status: TaskStatus) {
  return status === TaskStatus.READY_FOR_REVIEW || status === TaskStatus.COMPLETED;
}

function assertRequiredChecklistSatisfied(
  task: { checklistItems?: Array<{ label: string; isRequired: boolean; completed: boolean }> },
  status: TaskStatus
) {
  if (!shouldEnforceRequiredUpdateFields(status)) return;
  const incomplete = (task.checklistItems ?? []).filter((item) => item.isRequired && !item.completed);
  if (incomplete.length) {
    throw new Error(`Task checklist is incomplete: ${incomplete.map((item) => item.label).join(", ")}.`);
  }
}

function assertConcernDependenciesSatisfied(
  task: {
    concernLink?: {
      dependsOnStepCodes: unknown;
      concernCase: { taskLinks: Array<{ stepCode: string; task: { status: TaskStatus } }> };
    } | null;
  },
  status: TaskStatus
) {
  if (status === TaskStatus.NOT_STARTED || status === TaskStatus.BLOCKED || !task.concernLink) return;
  const dependencyCodes = Array.isArray(task.concernLink.dependsOnStepCodes)
    ? task.concernLink.dependsOnStepCodes.filter((value): value is string => typeof value === "string")
    : [];
  const incomplete = dependencyCodes.filter((code) =>
    task.concernLink?.concernCase.taskLinks.some(
      (link) => link.stepCode === code && link.task.status !== TaskStatus.COMPLETED
    )
  );
  if (incomplete.length) throw new Error(`Concern task dependencies are incomplete: ${incomplete.join(", ")}.`);
}

function assertRequiredUpdateFieldsSatisfied(
  task: {
    templateSnapshot?: unknown;
    updateFieldValues?: unknown;
  },
  input: NormalizedTaskStatusUpdateInput
) {
  const requiredUpdateFields = normalizeTemplateRequiredUpdateFields(task.templateSnapshot);

  if (requiredUpdateFields.length === 0) {
    return {
      mergedUpdateFieldValues: mergeUpdateFieldValues(task.updateFieldValues, input.updateFields)
    };
  }

  validateIncomingUpdateFieldsAgainstTemplate(requiredUpdateFields, input.updateFields);

  const mergedUpdateFieldValues = mergeUpdateFieldValues(task.updateFieldValues, input.updateFields);
  const completionCriteria = normalizeTemplateCompletionCriteria(task.templateSnapshot);
  const requiredFieldKeys = new Set([
    ...requiredUpdateFields.filter((field) => field.required).map((field) => field.key),
    ...(completionCriteria?.requiredFieldKeys ?? [])
  ]);

  if (!shouldEnforceRequiredUpdateFields(input.status)) {
    return { mergedUpdateFieldValues };
  }

  const missingLabels = requiredUpdateFields
    .filter((field) => requiredFieldKeys.has(field.key))
    .filter((field) => {
      const value = mergedUpdateFieldValues[field.key];

      if (field.type === "boolean") {
        return typeof value !== "boolean";
      }

      return typeof value !== "string" || !value.trim();
    })
    .map((field) => field.label);

  if (missingLabels.length > 0) {
    throw new Error(`Task update is missing required fields: ${missingLabels.join(", ")}.`);
  }

  return { mergedUpdateFieldValues };
}

function getRequestedAction(
  status: TaskStatus
): "comment" | "status" | "complete" | "reassign" {
  if (status === TaskStatus.COMPLETED) {
    return "complete";
  }

  return "status";
}

function assertCanUpdateTaskStatus(
  user: AuthenticatedUser | null,
  task: {
    assignedUserId: string;
    requiresManagerApproval: boolean;
  },
  nextStatus: TaskStatus
): AuthenticatedUser {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (
    !canUpdateAssignedWork({
      actor: user,
      assignedUserId: task.assignedUserId,
      requiresManagerApproval: task.requiresManagerApproval,
      requestedAction: getRequestedAction(nextStatus)
    })
  ) {
    throw new Error("You do not have permission to update this task.");
  }

  return user;
}

function assertValidTaskStatusTransition(
  user: AuthenticatedUser,
  task: {
    status: TaskStatus;
    requiresManagerApproval: boolean;
  },
  nextStatus: TaskStatus
) {
  if (
    task.requiresManagerApproval &&
    nextStatus === TaskStatus.COMPLETED &&
    task.status !== TaskStatus.READY_FOR_REVIEW
  ) {
    throw new Error(approvalRequiredCompletionError);
  }

  if (
    task.requiresManagerApproval &&
    task.status === TaskStatus.READY_FOR_REVIEW &&
    nextStatus === TaskStatus.IN_PROGRESS &&
    !isManager(user)
  ) {
    throw new Error("You do not have permission to update this task.");
  }
}

function assertExecutionEvidenceGate(
  user: AuthenticatedUser,
  task: { acceptedAt?: Date | null; completionOverrideAt?: Date | null; status: TaskStatus },
  nextStatus: TaskStatus,
  flags: StaffExecutionFlags
) {
  if (!flags.enabled || !flags.taskAcceptanceEnabled || !shouldEnforceRequiredUpdateFields(nextStatus)) return;
  if (task.completionOverrideAt && isManager(user)) return;
  if (!task.acceptedAt) throw new Error("Accept this task before submitting it for completion.");
  if (
    task.status === TaskStatus.BLOCKED ||
    task.status === TaskStatus.WAITING_ON_PARTS ||
    task.status === TaskStatus.WAITING_ON_APPROVAL
  ) {
    throw new Error("Resolve the task's blocked or waiting condition before completion.");
  }
}

function buildTaskStatusUpdateData(
  user: AuthenticatedUser,
  task: {
    status: TaskStatus;
    requiresManagerApproval: boolean;
    templateSnapshot?: unknown;
    updateFieldValues?: unknown;
    checklistItems?: Array<{ label: string; isRequired: boolean; completed: boolean }>;
    concernLink?: {
      dependsOnStepCodes: unknown;
      concernCase: { taskLinks: Array<{ stepCode: string; task: { status: TaskStatus } }> };
    } | null;
  },
  input: NormalizedTaskStatusUpdateInput
  , skipEvidenceRequirements = false
) {
  const now = new Date();
  const managerReviewerId = task.requiresManagerApproval ? user.id : null;
  if (!skipEvidenceRequirements) {
    assertRequiredChecklistSatisfied(task, input.status);
    assertConcernDependenciesSatisfied(task, input.status);
  }
  const { mergedUpdateFieldValues } = skipEvidenceRequirements
    ? { mergedUpdateFieldValues: mergeUpdateFieldValues(task.updateFieldValues, input.updateFields) }
    : assertRequiredUpdateFieldsSatisfied(task, input);

  if (input.status === TaskStatus.BLOCKED) {
    if (!input.blockerReason) {
      throw new Error("Blocked tasks require a blocker reason.");
    }

    return {
      status: input.status,
      blockerReason: input.blockerReason,
      updateFieldValues: mergedUpdateFieldValues,
      ...(task.status === TaskStatus.READY_FOR_REVIEW
        ? {
            readyForReviewAt: null
          }
        : {}),
      completedAt: null,
      reviewedByUserId: null
    };
  }

  if (input.status === TaskStatus.READY_FOR_REVIEW) {
    return {
      status: input.status,
      updateFieldValues: mergedUpdateFieldValues,
      readyForReviewAt: now,
      completedAt: null,
      reviewedByUserId: null
    };
  }

  if (input.status === TaskStatus.COMPLETED) {
    return {
      status: input.status,
      updateFieldValues: mergedUpdateFieldValues,
      completedAt: now,
      reviewedByUserId: managerReviewerId
    };
  }

  return {
    status: input.status,
    updateFieldValues: mergedUpdateFieldValues,
    ...(task.status === TaskStatus.READY_FOR_REVIEW
      ? {
          readyForReviewAt: null
        }
      : {}),
    completedAt: null,
    reviewedByUserId: null
  };
}

function buildTaskStatusActivityMessage(
  actor: AuthenticatedUser,
  task: {
    title?: string;
    requiresManagerApproval: boolean;
  },
  nextStatus: TaskStatus,
  blockerReason?: string | null
) {
  const taskTitle = task.title ?? "this task";

  if (nextStatus === TaskStatus.BLOCKED) {
    return `${actor.name} marked ${taskTitle} blocked${blockerReason ? `: ${blockerReason}` : "."}`;
  }

  if (nextStatus === TaskStatus.READY_FOR_REVIEW) {
    return `${actor.name} marked ${taskTitle} ready for review.`;
  }

  if (nextStatus === TaskStatus.COMPLETED && task.requiresManagerApproval) {
    return `${actor.name} approved completion for ${taskTitle}.`;
  }

  if (nextStatus === TaskStatus.COMPLETED) {
    return `${actor.name} completed ${taskTitle}.`;
  }

  return `${actor.name} updated ${taskTitle} to ${nextStatus.toLowerCase().replace(/_/g, " ")}.`;
}

function resolveTaskAppointmentAutomationRequest(input: {
  previousStatus: TaskStatus;
  nextStatus: TaskStatus;
  task: {
    requiresManagerApproval: boolean;
  };
  update: NormalizedTaskStatusUpdateInput;
}) {
  const explicitTriggerCode = input.update.appointmentAutomationTriggerCode;
  const explicitReasonNotes =
    input.update.appointmentAutomationReasonNotes ?? input.update.blockerReason ?? null;

  if (explicitTriggerCode) {
    return {
      triggerCode: explicitTriggerCode,
      reasonNotes: explicitReasonNotes
    };
  }

  if (input.previousStatus === input.nextStatus) {
    return null;
  }

  if (input.nextStatus === TaskStatus.BLOCKED) {
    return {
      triggerCode: "BLOCKED_TASK_REVIEW",
      reasonNotes: input.update.blockerReason ?? null
    };
  }

  if (input.nextStatus === TaskStatus.READY_FOR_REVIEW && input.task.requiresManagerApproval) {
    return {
      triggerCode: "ESCALATION_TASK_REVIEW",
      reasonNotes: input.update.appointmentAutomationReasonNotes ?? null
    };
  }

  return null;
}

function toTaskStatusUpdateResult(task: {
  id: string;
  status: TaskStatus;
  blockerReason: string | null;
  updateFieldValues?: unknown;
  updatedAt: Date;
}): TaskStatusUpdateResult {
  return {
    id: task.id,
    status: task.status,
    blockerReason: task.blockerReason?.trim() ? task.blockerReason.trim() : null,
    updateFieldValues: normalizeStoredUpdateFieldValues(task.updateFieldValues),
    updatedAt: task.updatedAt.toISOString()
  };
}

export async function updateTaskStatus(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  repository: TaskStatusRepository = createTaskStatusRepository(),
  dependencies?: {
    staffExecutionFlags?: StaffExecutionFlags;
    taskAppointmentAutomationRunner?: typeof runTaskAppointmentAutomationForTaskEvent;
  }
) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedInput = normalizeTaskStatusUpdateInput(input);
  const task = await repository.findTaskById(normalizedTaskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  const authenticatedUser = assertCanUpdateTaskStatus(user, task, normalizedInput.status);
  assertValidTaskStatusTransition(authenticatedUser, task, normalizedInput.status);
  const staffExecutionFlags = dependencies?.staffExecutionFlags ?? getStaffExecutionFlags();
  assertExecutionEvidenceGate(
    authenticatedUser,
    task,
    normalizedInput.status,
    staffExecutionFlags
  );
  const previousStatus = task.status;

  const updatedTask = await repository.updateTaskStatus(
    normalizedTaskId,
    buildTaskStatusUpdateData(
      authenticatedUser,
      task,
      normalizedInput,
      Boolean(staffExecutionFlags.taskAcceptanceEnabled && task.completionOverrideAt && isManager(authenticatedUser))
    )
  );

  if (repository.supportsActivityEvents && task.boardDayId) {
    await recordBoardActivityEvent({
      boardDayId: task.boardDayId,
      actorUserId: authenticatedUser.id,
      taskId: normalizedTaskId,
      eventType: `task.${normalizedInput.status.toLowerCase()}`,
      message: buildTaskStatusActivityMessage(
        authenticatedUser,
        task,
        normalizedInput.status,
        normalizedInput.blockerReason ?? null
      ),
      metadata: {
        nextStatus: normalizedInput.status,
        previousStatus
      }
    });
  }

  const automationRequest = resolveTaskAppointmentAutomationRequest({
    previousStatus,
    nextStatus: normalizedInput.status,
    task,
    update: normalizedInput
  });

  if (automationRequest) {
    const taskAppointmentAutomationRunner =
      dependencies?.taskAppointmentAutomationRunner ?? runTaskAppointmentAutomationForTaskEvent;

    await taskAppointmentAutomationRunner(authenticatedUser, {
      reasonNotes: automationRequest.reasonNotes,
      taskId: normalizedTaskId,
      triggerCode: automationRequest.triggerCode
    });
  }

  return toTaskStatusUpdateResult(updatedTask);
}
