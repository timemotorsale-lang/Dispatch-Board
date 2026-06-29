import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageAssignments } from "@/server/policies/access";
import {
  createTaskAssignmentRepository,
  type TaskAssignmentRecord,
  type TaskAssignmentRepository
} from "@/server/repositories/task-assignment-repository";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import { normalizeTaskAssignmentInput } from "@/server/validation/task-assignment";

type TaskAssignmentUserSummary = {
  id: string;
  name: string;
  email?: string;
};

export type TaskAssignmentResult = {
  id: string;
  assignedUser: TaskAssignmentUserSummary;
  recommendedUser: TaskAssignmentUserSummary | null;
  recommendation: {
    reasonCode: string;
    explanation: string;
  } | null;
  updatedAt: string;
};

function normalizeTaskId(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  return normalizedTaskId;
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
    updatedAt: task.updatedAt.toISOString()
  };
}

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
}
