import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createTaskReadRepository,
  type TaskReadRecord,
  type TaskReadRepository
} from "@/server/repositories/task-read-repository";
import { assertCanViewBoard } from "@/server/services/board-read";
import type { TaskTemplateRequiredUpdateField } from "@/server/validation/task-template";

type TaskReadUserSummary = {
  id: string;
  name: string;
  email?: string;
};

type TaskReadRecommendation = {
  reasonCode: string;
  explanation: string;
};

export type TaskCommentReadModel = {
  id: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  author: TaskReadUserSummary;
};

export type TaskReadModel = {
  id: string;
  boardDayId: string;
  boardDate: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: string;
  workflowArea: string;
  sourceType: string;
  requiresManagerApproval: boolean;
  requiredUpdateFields: TaskTemplateRequiredUpdateField[];
  updateFieldValues: Record<string, string | boolean>;
  vehicleReference: string | null;
  customerReference: string | null;
  blockerReason: string | null;
  readyForReviewAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser: TaskReadUserSummary;
  recommendedUser: TaskReadUserSummary | null;
  recommendation: TaskReadRecommendation | null;
  createdByUser: TaskReadUserSummary | null;
  reviewedByUser: TaskReadUserSummary | null;
  comments: TaskCommentReadModel[];
};

function normalizeTaskId(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  return normalizedTaskId;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRequiredUpdateFields(snapshot: unknown): TaskTemplateRequiredUpdateField[] {
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

function normalizeUpdateFieldValues(value: unknown) {
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

function toUserSummary(
  user: {
    id: string;
    name: string;
    email: string;
  } | null
): TaskReadUserSummary | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email || undefined
  };
}

function toTaskReadModel(task: TaskReadRecord): TaskReadModel {
  const recommendation =
    task.recommendationReasonCode && task.recommendationExplanation
      ? {
          reasonCode: task.recommendationReasonCode,
          explanation: task.recommendationExplanation
        }
      : null;

  return {
    id: task.id,
    boardDayId: task.boardDay.id,
    boardDate: task.boardDay.date.toISOString().slice(0, 10),
    title: task.title,
    description: normalizeOptionalText(task.description),
    status: task.status,
    dueAt: task.dueAt.toISOString(),
    workflowArea: task.workflowArea,
    sourceType: task.sourceType,
    requiresManagerApproval: task.requiresManagerApproval,
    requiredUpdateFields: normalizeRequiredUpdateFields(task.templateSnapshot),
    updateFieldValues: normalizeUpdateFieldValues(task.updateFieldValues),
    vehicleReference: normalizeOptionalText(task.vehicleReference),
    customerReference: normalizeOptionalText(task.customerReference),
    blockerReason: normalizeOptionalText(task.blockerReason),
    readyForReviewAt: task.readyForReviewAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assignedUser: {
      id: task.assignedUser.id,
      name: task.assignedUser.name,
      email: task.assignedUser.email || undefined
    },
    recommendedUser: toUserSummary(task.recommendedUser),
    recommendation,
    createdByUser: toUserSummary(task.createdByUser),
    reviewedByUser: toUserSummary(task.reviewedByUser),
    comments: task.comments.map((comment) => ({
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
    }))
  };
}

export async function getTaskReadModelById(
  user: AuthenticatedUser | null,
  taskId: string,
  repository: TaskReadRepository = createTaskReadRepository()
) {
  assertCanViewBoard(user);

  const normalizedTaskId = normalizeTaskId(taskId);
  const task = await repository.findTaskById(normalizedTaskId);

  if (!task) {
    return null;
  }

  return toTaskReadModel(task);
}
