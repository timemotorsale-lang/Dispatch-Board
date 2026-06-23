import { ActivityEventType, TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canUpdateAssignedWork, isManager } from "@/server/policies/access";
import {
  createTaskStatusRepository,
  type TaskStatusRepository
} from "@/server/repositories/task-status-repository";
import {
  normalizeTaskStatusUpdateInput,
  type NormalizedTaskStatusUpdateInput
} from "@/server/validation/task-status";

export type TaskStatusUpdateResult = {
  id: string;
  status: TaskStatus;
  blockerReason: string | null;
  updatedAt: string;
};

const taskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: "Not Started",
  [TaskStatus.IN_PROGRESS]: "In Progress",
  [TaskStatus.BLOCKED]: "Blocked",
  [TaskStatus.WAITING_ON_PARTS]: "Waiting on Parts",
  [TaskStatus.WAITING_ON_APPROVAL]: "Waiting on Approval",
  [TaskStatus.READY_FOR_REVIEW]: "Ready for Review",
  [TaskStatus.COMPLETED]: "Completed"
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

function buildTaskStatusUpdateData(
  user: AuthenticatedUser,
  task: {
    status: TaskStatus;
    requiresManagerApproval: boolean;
  },
  input: NormalizedTaskStatusUpdateInput
) {
  const now = new Date();
  const managerReviewerId = task.requiresManagerApproval ? user.id : null;

  if (input.status === TaskStatus.BLOCKED) {
    if (!input.blockerReason) {
      throw new Error("Blocked tasks require a blocker reason.");
    }

    return {
      status: input.status,
      blockerReason: input.blockerReason,
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
      readyForReviewAt: now,
      completedAt: null,
      reviewedByUserId: null
    };
  }

  if (input.status === TaskStatus.COMPLETED) {
    return {
      status: input.status,
      completedAt: now,
      reviewedByUserId: managerReviewerId
    };
  }

  return {
    status: input.status,
    ...(task.status === TaskStatus.READY_FOR_REVIEW
      ? {
          readyForReviewAt: null
        }
      : {}),
    completedAt: null,
    reviewedByUserId: null
  };
}

function toTaskStatusUpdateResult(task: {
  id: string;
  status: TaskStatus;
  blockerReason: string | null;
  updatedAt: Date;
}): TaskStatusUpdateResult {
  return {
    id: task.id,
    status: task.status,
    blockerReason: task.blockerReason?.trim() ? task.blockerReason.trim() : null,
    updatedAt: task.updatedAt.toISOString()
  };
}

function getSpecificStatusEventType(
  previousStatus: TaskStatus,
  nextStatus: TaskStatus,
  requiresManagerApproval: boolean
) {
  if (nextStatus === TaskStatus.BLOCKED) {
    return ActivityEventType.TASK_BLOCKED;
  }

  if (nextStatus === TaskStatus.WAITING_ON_PARTS) {
    return ActivityEventType.TASK_WAITING_ON_PARTS;
  }

  if (nextStatus === TaskStatus.WAITING_ON_APPROVAL) {
    return ActivityEventType.TASK_WAITING_ON_APPROVAL;
  }

  if (nextStatus === TaskStatus.READY_FOR_REVIEW) {
    return ActivityEventType.TASK_READY_FOR_REVIEW;
  }

  if (nextStatus === TaskStatus.COMPLETED) {
    return requiresManagerApproval && previousStatus === TaskStatus.READY_FOR_REVIEW
      ? ActivityEventType.MANAGER_APPROVED_COMPLETION
      : ActivityEventType.TASK_COMPLETED;
  }

  return null;
}

function buildStatusChangedMessage(previousStatus: TaskStatus, nextStatus: TaskStatus) {
  return `Status changed from ${taskStatusLabels[previousStatus]} to ${taskStatusLabels[nextStatus]}`;
}

async function recordStatusActivityEvents(
  repository: TaskStatusRepository,
  actorUserId: string,
  previousTask: {
    boardDayId: string;
    id: string;
    requiresManagerApproval: boolean;
    status: TaskStatus;
  },
  updatedTask: {
    blockerReason: string | null;
    completedAt: Date | null;
    readyForReviewAt: Date | null;
    reviewedByUserId: string | null;
    status: TaskStatus;
  }
) {
  if (previousTask.status === updatedTask.status) {
    return;
  }

  const metadata = {
    ...(updatedTask.status === TaskStatus.BLOCKED
      ? {
          blockerReason: updatedTask.blockerReason?.trim() ?? null
        }
      : {}),
    completedAt: updatedTask.completedAt?.toISOString() ?? null,
    newStatus: updatedTask.status,
    previousStatus: previousTask.status,
    readyForReviewAt: updatedTask.readyForReviewAt?.toISOString() ?? null,
    reviewedByUserId: updatedTask.reviewedByUserId
  };

  await repository.createActivityEvent({
    actorUserId,
    boardDayId: previousTask.boardDayId,
    eventType: ActivityEventType.STATUS_CHANGED,
    message: buildStatusChangedMessage(previousTask.status, updatedTask.status),
    metadata,
    taskId: previousTask.id
  });

  const specificEventType = getSpecificStatusEventType(
    previousTask.status,
    updatedTask.status,
    previousTask.requiresManagerApproval
  );

  if (!specificEventType) {
    return;
  }

  await repository.createActivityEvent({
    actorUserId,
    boardDayId: previousTask.boardDayId,
    eventType: specificEventType,
    message: `Task marked ${taskStatusLabels[updatedTask.status]}`,
    metadata,
    taskId: previousTask.id
  });
}

export async function updateTaskStatus(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  repository: TaskStatusRepository = createTaskStatusRepository()
) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedInput = normalizeTaskStatusUpdateInput(input);
  const task = await repository.findTaskById(normalizedTaskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  const authenticatedUser = assertCanUpdateTaskStatus(user, task, normalizedInput.status);
  assertValidTaskStatusTransition(authenticatedUser, task, normalizedInput.status);

  const updatedTask = await repository.updateTaskStatus(
    normalizedTaskId,
    buildTaskStatusUpdateData(authenticatedUser, task, normalizedInput)
  );

  await recordStatusActivityEvents(repository, authenticatedUser.id, task, updatedTask);

  return toTaskStatusUpdateResult(updatedTask);
}
