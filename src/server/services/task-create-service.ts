import { TaskSourceType, TaskStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageAssignments } from "@/server/policies/access";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import {
  createTaskCreateRepository,
  type CreatedTaskRecord,
  type TaskCreateRepository
} from "@/server/repositories/task-create-repository";
import {
  normalizeTaskCreateInput,
  type NormalizedTaskCreateInput
} from "@/server/validation/task-create";

type TaskCreateUserSummary = {
  id: string;
  name: string;
  email?: string;
};

export type ManualTaskCreateResult = {
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
  vehicleReference: string | null;
  customerReference: string | null;
  blockerReason: string | null;
  readyForReviewAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser: TaskCreateUserSummary;
  createdByUser: TaskCreateUserSummary | null;
  reviewedByUser: TaskCreateUserSummary | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function toUserSummary(
  user: {
    id: string;
    name: string;
    email: string;
  } | null
): TaskCreateUserSummary | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email || undefined
  };
}

function assertCanCreateManualTasks(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageAssignments(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

function buildManualTaskWorkflowFields(
  user: AuthenticatedUser,
  input: NormalizedTaskCreateInput
) {
  const now = new Date();

  if (input.status === TaskStatus.BLOCKED) {
    return {
      blockerReason: input.blockerReason,
      completedAt: null,
      readyForReviewAt: null,
      reviewedByUserId: null
    };
  }

  if (input.status === TaskStatus.READY_FOR_REVIEW) {
    return {
      completedAt: null,
      readyForReviewAt: now,
      reviewedByUserId: null
    };
  }

  if (input.status === TaskStatus.COMPLETED) {
    return {
      completedAt: now,
      reviewedByUserId: input.requiresManagerApproval ? user.id : null
    };
  }

  return {
    completedAt: null,
    readyForReviewAt: null,
    reviewedByUserId: null
  };
}

function toManualTaskCreateResult(task: CreatedTaskRecord): ManualTaskCreateResult {
  return {
    id: task.id,
    boardDayId: task.boardDay.id,
    boardDate: task.boardDay.date.toISOString().slice(0, 10),
    title: task.title,
    description: normalizeOptionalText(task.description),
    status: task.status,
    dueAt: task.dueAt.toISOString(),
    workflowArea: task.workflowArea,
    sourceType: task.sourceType ?? TaskSourceType.MANAGER,
    requiresManagerApproval: task.requiresManagerApproval,
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
    createdByUser: toUserSummary(task.createdByUser),
    reviewedByUser: toUserSummary(task.reviewedByUser)
  };
}

export async function createManualTask(
  user: AuthenticatedUser | null,
  input: unknown,
  repository: TaskCreateRepository = createTaskCreateRepository()
) {
  const authenticatedUser = assertCanCreateManualTasks(user);
  const normalizedInput = normalizeTaskCreateInput(input);
  const assignedUser = await repository.findAssignedUserById(normalizedInput.assignedUserId);

  if (!assignedUser) {
    throw new Error("Assigned user not found.");
  }

  if (!assignedUser.isActive) {
    throw new Error("Assigned user must be active.");
  }

  const boardDay = await repository.getOrCreateBoardDay(normalizedInput.boardDate);
  const workflowFields = buildManualTaskWorkflowFields(authenticatedUser, normalizedInput);
  const task = await repository.createTask({
    assignedUserId: normalizedInput.assignedUserId,
    ...(workflowFields.blockerReason ? { blockerReason: workflowFields.blockerReason } : {}),
    boardDayId: boardDay.id,
    completedAt: workflowFields.completedAt,
    createdByUserId: authenticatedUser.id,
    ...(normalizedInput.customerReference
      ? { customerReference: normalizedInput.customerReference }
      : {}),
    description: normalizedInput.description,
    dueAt: normalizedInput.dueAt,
    readyForReviewAt: workflowFields.readyForReviewAt,
    requiresManagerApproval: normalizedInput.requiresManagerApproval,
    reviewedByUserId: workflowFields.reviewedByUserId,
    status: normalizedInput.status,
    title: normalizedInput.title,
    ...(normalizedInput.vehicleReference
      ? { vehicleReference: normalizedInput.vehicleReference }
      : {}),
    workflowArea: normalizedInput.workflowArea
  });

  if (repository.supportsActivityEvents) {
    await recordBoardActivityEvent({
      boardDayId: boardDay.id,
      actorUserId: authenticatedUser.id,
      taskId: task.id,
      eventType: "task.created",
      message: `${authenticatedUser.name} created ${task.title} for ${task.assignedUser.name}.`,
      metadata: {
        assignedUserId: task.assignedUser.id,
        assignedUserName: task.assignedUser.name,
        requiresManagerApproval: task.requiresManagerApproval
      }
    });
  }

  return toManualTaskCreateResult(task);
}
