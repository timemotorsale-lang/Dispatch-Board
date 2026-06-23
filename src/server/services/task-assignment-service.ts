import { ActivityEventType } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageAssignments } from "@/server/policies/access";
import {
  createTaskAssignmentRepository,
  type TaskAssignmentRecord,
  type TaskAssignmentRepository
} from "@/server/repositories/task-assignment-repository";
import {
  normalizeTaskAssignmentInput,
  type NormalizedTaskAssignmentInput
} from "@/server/validation/task-assignment";

type TaskAssignmentUserSummary = {
  id: string;
  name: string;
  email?: string;
};

export type TaskAssignmentResult = {
  id: string;
  assignedUser: TaskAssignmentUserSummary;
  previousAssignedUserId: string;
  recommendedUser: TaskAssignmentUserSummary | null;
  recommendationReasonCode: string | null;
  recommendationReasonText: string | null;
  recommendationReviewNeeded: boolean | null;
  updatedAt: string;
};

function normalizeTaskId(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  return normalizedTaskId;
}

function assertCanAssignTasks(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageAssignments(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

function toUserSummary(
  user: {
    id: string;
    name: string;
    email: string;
  } | null
): TaskAssignmentUserSummary | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email || undefined
  };
}

function resolveAssignedUserId(task: TaskAssignmentRecord, input: NormalizedTaskAssignmentInput) {
  if (input.mode === "accept_recommendation") {
    if (!task.recommendedUserId) {
      throw new Error("Task does not have a stored recommendation to accept.");
    }

    return task.recommendedUserId;
  }

  if (!input.assignedUserId) {
    throw new Error("Task assignment requires an assigned user.");
  }

  return input.assignedUserId;
}

function assertModeMatchesTaskState(task: TaskAssignmentRecord, input: NormalizedTaskAssignmentInput) {
  if (input.mode === "override" && !task.recommendedUserId) {
    throw new Error("Task does not have a stored recommendation to override.");
  }

  if (input.mode === "reassign" && !task.assignedUserId) {
    throw new Error("Task is not currently assigned.");
  }
}

function toTaskAssignmentResult(
  previousAssignedUserId: string,
  task: TaskAssignmentRecord
): TaskAssignmentResult {
  const assignedUser = toUserSummary(task.assignedUser);

  if (!assignedUser) {
    throw new Error("Assigned user not found.");
  }

  return {
    id: task.id,
    assignedUser,
    previousAssignedUserId,
    recommendedUser: toUserSummary(task.recommendedUser),
    recommendationReasonCode: task.recommendationReasonCode,
    recommendationReasonText: task.recommendationReasonText,
    recommendationReviewNeeded: task.recommendationReviewNeeded,
    updatedAt: task.updatedAt.toISOString()
  };
}

function getAssignmentEventType(input: NormalizedTaskAssignmentInput) {
  if (input.mode === "accept_recommendation") {
    return ActivityEventType.TASK_ASSIGNED;
  }

  return ActivityEventType.ASSIGNMENT_CHANGED;
}

function buildAssignmentMessage(input: NormalizedTaskAssignmentInput, assignedUserName: string) {
  if (input.mode === "accept_recommendation") {
    return `Recommendation accepted: assigned to ${assignedUserName}`;
  }

  if (input.mode === "override") {
    return `Recommendation overridden: assigned to ${assignedUserName}`;
  }

  return `Task reassigned to ${assignedUserName}`;
}

export async function assignTask(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  repository: TaskAssignmentRepository = createTaskAssignmentRepository()
) {
  const authenticatedUser = assertCanAssignTasks(user);
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedInput = normalizeTaskAssignmentInput(input);
  const task = await repository.findTaskById(normalizedTaskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  assertModeMatchesTaskState(task, normalizedInput);

  const nextAssignedUserId = resolveAssignedUserId(task, normalizedInput);
  const assignedUser = await repository.findUserById(nextAssignedUserId);

  if (!assignedUser) {
    throw new Error("Assigned user not found.");
  }

  if (!assignedUser.isActive) {
    throw new Error("Assigned user must be active.");
  }

  const previousAssignedUserId = task.assignedUserId;

  if (task.sourceTemplateId && previousAssignedUserId !== nextAssignedUserId) {
    const duplicateGeneratedTask = await repository.findTaskByBoardTemplateAndAssignee({
      assignedUserId: nextAssignedUserId,
      boardDayId: task.boardDayId,
      excludedTaskId: task.id,
      sourceTemplateId: task.sourceTemplateId
    });

    if (duplicateGeneratedTask) {
      throw new Error("Assigned user already has this generated template task.");
    }
  }

  const updatedTask =
    previousAssignedUserId === nextAssignedUserId
      ? task
      : await repository.updateTaskAssignment(normalizedTaskId, nextAssignedUserId);
  const result = toTaskAssignmentResult(previousAssignedUserId, updatedTask);

  await repository.createActivityEvent({
    actorUserId: authenticatedUser.id,
    boardDayId: task.boardDayId,
    eventType: getAssignmentEventType(normalizedInput),
    message: buildAssignmentMessage(normalizedInput, assignedUser.name),
    metadata: {
      assignedUserId: nextAssignedUserId,
      mode: normalizedInput.mode,
      previousAssignedUserId,
      reason: normalizedInput.reason,
      recommendationReasonCode: task.recommendationReasonCode,
      recommendedUserId: task.recommendedUserId
    },
    taskId: task.id
  });

  return result;
}
