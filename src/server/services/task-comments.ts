import type { AuthenticatedUser } from "@/server/auth/store";
import { canUpdateAssignedWork } from "@/server/policies/access";
import {
  createTaskCommentRepository,
  type TaskCommentRecord,
  type TaskCommentRepository
} from "@/server/repositories/task-comment-repository";
import { assertCanViewBoard } from "@/server/services/board-read";
import {
  normalizeTaskCommentInput,
  type NormalizedTaskCommentInput
} from "@/server/validation/task-comment";

type TaskCommentAuthorSummary = {
  id: string;
  name: string;
  email?: string;
};

export type TaskCommentModel = {
  id: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  author: TaskCommentAuthorSummary;
};

function normalizeTaskId(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  return normalizedTaskId;
}

function assertCanCommentOnTask(
  user: AuthenticatedUser | null,
  task: {
    assignedUserId: string;
    requiresManagerApproval: boolean;
  }
) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (
    !canUpdateAssignedWork({
      actor: user,
      assignedUserId: task.assignedUserId,
      requiresManagerApproval: task.requiresManagerApproval,
      requestedAction: "comment"
    })
  ) {
    throw new Error("You do not have permission to comment on this task.");
  }

  return user;
}

function toTaskCommentModel(comment: TaskCommentRecord): TaskCommentModel {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorUserId: comment.authorUserId,
    body: comment.body.trim(),
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.authorUser.id,
      name: comment.authorUser.name,
      email: comment.authorUser.email || undefined
    }
  };
}

async function requireTaskForComments(
  repository: TaskCommentRepository,
  taskId: string
) {
  const task = await repository.findTaskById(taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  return task;
}

export async function listTaskComments(
  user: AuthenticatedUser | null,
  taskId: string,
  repository: TaskCommentRepository = createTaskCommentRepository()
) {
  assertCanViewBoard(user);

  const normalizedTaskId = normalizeTaskId(taskId);
  await requireTaskForComments(repository, normalizedTaskId);

  const comments = await repository.listCommentsForTask(normalizedTaskId);

  return comments.map(toTaskCommentModel);
}

export async function createTaskComment(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  repository: TaskCommentRepository = createTaskCommentRepository()
) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedInput: NormalizedTaskCommentInput = normalizeTaskCommentInput(input);
  const task = await requireTaskForComments(repository, normalizedTaskId);
  const authenticatedUser = assertCanCommentOnTask(user, task);

  const comment = await repository.createCommentWithActivityEvent(
    normalizedTaskId,
    authenticatedUser.id,
    normalizedInput.body
  );

  return toTaskCommentModel(comment);
}
