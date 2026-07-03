<<<<<<< HEAD
=======
import { ActivityEventType } from "@prisma/client";

>>>>>>> main
import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageAssignments } from "@/server/policies/access";
import {
  createTaskAssignmentRepository,
  type TaskAssignmentRecord,
  type TaskAssignmentRepository
} from "@/server/repositories/task-assignment-repository";
<<<<<<< HEAD
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import { normalizeTaskAssignmentInput } from "@/server/validation/task-assignment";
=======
import {
  normalizeTaskAssignmentInput,
  type NormalizedTaskAssignmentInput
} from "@/server/validation/task-assignment";
>>>>>>> main

type TaskAssignmentUserSummary = {
  id: string;
  name: string;
  email?: string;
};

export type TaskAssignmentResult = {
  id: string;
  assignedUser: TaskAssignmentUserSummary;
<<<<<<< HEAD
  recommendedUser: TaskAssignmentUserSummary | null;
  recommendation: {
    reasonCode: string;
    explanation: string;
  } | null;
=======
  previousAssignedUserId: string;
  recommendedUser: TaskAssignmentUserSummary | null;
  recommendationReasonCode: string | null;
  recommendationReasonText: string | null;
  recommendationReviewNeeded: boolean | null;
>>>>>>> main
  updatedAt: string;
};

function normalizeTaskId(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  return normalizedTaskId;
}

<<<<<<< HEAD
=======
function assertCanAssignTasks(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageAssignments(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

>>>>>>> main
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

<<<<<<< HEAD
function assertCanManageTaskAssignments(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageAssignments(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

function toTaskAssignmentResult(task: TaskAssignmentRecord): TaskAssignmentResult {
  return {
    id: task.id,
    assignedUser: {
      id: task.assignedUser.id,
      name: task.assignedUser.name,
      email: task.assignedUser.email || undefined
    },
    recommendedUser: toUserSummary(task.recommendedUser),
    recommendation:
      task.recommendationReasonCode && task.recommendationExplanation
        ? {
            reasonCode: task.recommendationReasonCode,
            explanation: task.recommendationExplanation
          }
        : null,
=======
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
>>>>>>> main
    updatedAt: task.updatedAt.toISOString()
  };
}

<<<<<<< HEAD
function buildReassignmentActivityMessage(
  actor: AuthenticatedUser,
  taskTitle: string,
  previousAssigneeName: string,
  nextAssigneeName: string,
  recommendedUserName: string | null
) {
  if (recommendedUserName && recommendedUserName === nextAssigneeName) {
    return `${actor.name} reassigned ${taskTitle} to ${nextAssigneeName}, restoring the recommended assignment from ${previousAssigneeName}.`;
  }

  if (recommendedUserName && recommendedUserName !== nextAssigneeName) {
    return `${actor.name} reassigned ${taskTitle} from ${previousAssigneeName} to ${nextAssigneeName}, overriding the recommendation for ${recommendedUserName}.`;
  }

  return `${actor.name} reassigned ${taskTitle} from ${previousAssigneeName} to ${nextAssigneeName}.`;
}

export async function updateTaskAssignment(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  repository: TaskAssignmentRepository = createTaskAssignmentRepository()
) {
  const authenticatedUser = assertCanManageTaskAssignments(user);
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedInput = normalizeTaskAssignmentInput(input);
  const task = await repository.findTaskById(normalizedTaskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  if (task.assignedUserId === normalizedInput.assignedUserId) {
    throw new Error("Task is already assigned to this user.");
  }

  const nextAssignedUser = await repository.findAssignableUserById(normalizedInput.assignedUserId);

  if (!nextAssignedUser) {
    throw new Error("Assigned user not found.");
  }

  if (!nextAssignedUser.isActive) {
    throw new Error("Assigned user must be active.");
  }

  if (task.sourceTemplateId) {
    const conflictingTask = await repository.findGeneratedAssignmentConflict({
      boardDayId: task.boardDayId,
      sourceTemplateId: task.sourceTemplateId,
      assignedUserId: normalizedInput.assignedUserId,
      excludeTaskId: task.id
    });

    if (conflictingTask) {
      throw new Error(
        "This generated task already exists for the selected user on the same board date."
      );
    }
  }

  const updatedTask = await repository.updateTaskAssignment(task.id, normalizedInput.assignedUserId);

  if (repository.supportsActivityEvents) {
    await recordBoardActivityEvent({
      boardDayId: task.boardDayId,
      actorUserId: authenticatedUser.id,
      taskId: task.id,
      eventType: "task.reassigned",
      message: buildReassignmentActivityMessage(
        authenticatedUser,
        task.title,
        task.assignedUser.name,
        updatedTask.assignedUser.name,
        task.recommendedUser?.name ?? null
      ),
      metadata: {
        previousAssignedUserId: task.assignedUser.id,
        previousAssignedUserName: task.assignedUser.name,
        nextAssignedUserId: updatedTask.assignedUser.id,
        nextAssignedUserName: updatedTask.assignedUser.name,
        recommendedUserId: task.recommendedUser?.id ?? null,
        recommendedUserName: task.recommendedUser?.name ?? null
      }
    });
  }

  return toTaskAssignmentResult(updatedTask);
=======
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
>>>>>>> main
}

export async function assignTask(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  repository: TaskAssignmentRepository = createTaskAssignmentRepository()
) {
<<<<<<< HEAD
  return updateTaskAssignment(user, taskId, input, repository);
=======
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
>>>>>>> main
}
