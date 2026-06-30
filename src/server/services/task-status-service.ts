import { TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canUpdateAssignedWork, isManager } from "@/server/policies/access";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
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
  const previousStatus = task.status;

  const updatedTask = await repository.updateTaskStatus(
    normalizedTaskId,
    buildTaskStatusUpdateData(authenticatedUser, task, normalizedInput)
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

  return toTaskStatusUpdateResult(updatedTask);
}
