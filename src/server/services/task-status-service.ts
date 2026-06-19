import { TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canUpdateAssignedWork } from "@/server/policies/access";
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
) {
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
}

function buildTaskStatusUpdateData(input: NormalizedTaskStatusUpdateInput) {
  if (input.status === TaskStatus.BLOCKED) {
    if (!input.blockerReason) {
      throw new Error("Blocked tasks require a blocker reason.");
    }

    return {
      status: input.status,
      blockerReason: input.blockerReason
    };
  }

  return {
    status: input.status
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

  assertCanUpdateTaskStatus(user, task, normalizedInput.status);

  const updatedTask = await repository.updateTaskStatus(
    normalizedTaskId,
    buildTaskStatusUpdateData(normalizedInput)
  );

  return toTaskStatusUpdateResult(updatedTask);
}
