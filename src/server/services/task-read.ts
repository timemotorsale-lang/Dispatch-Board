import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createTaskReadRepository,
  type TaskReadRecord,
  type TaskReadRepository
} from "@/server/repositories/task-read-repository";
import { assertCanViewBoard } from "@/server/services/board-read";
import type {
  TaskTemplateApprovalRules,
  TaskTemplateChecklistItem,
  TaskTemplateCompletionCriteria,
  TaskTemplateRequiredUpdateField
} from "@/server/validation/task-template";

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

export type TaskChecklistItemReadModel = {
  id: string;
  kind: string;
  key: string | null;
  label: string;
  required: boolean;
  completed: boolean;
  sortOrder: number;
  completedAt: string | null;
  completedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskActivityReadModel = {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
  actor: TaskReadUserSummary | null;
};

export type TaskAppointmentLinkReadModel = {
  id: string;
  appointmentId: string;
  appointmentNumber: string;
  appointmentTitle: string;
  startsAt: string | null;
  endsAt: string | null;
  bookingStatus: string;
  attendanceStatus: string;
  executionStatus: string;
  followUpDispositionCode: string | null;
  linkType: string;
  linkCode: string;
  linkTitle: string;
  explanation: string | null;
  isRequired: boolean;
  blocksAppointment: boolean;
  blocksTask: boolean;
  createdAt: string;
};

export type TaskReadModel = {
  id: string;
  boardDayId: string;
  boardDate: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string;
  workflowArea: string;
  sourceType: string;
  requiresManagerApproval: boolean;
  requiredUpdateFields: TaskTemplateRequiredUpdateField[];
  updateFieldValues: Record<string, string | boolean>;
  templateChecklistItems: TaskTemplateChecklistItem[];
  completionCriteria: TaskTemplateCompletionCriteria | null;
  approvalRules: TaskTemplateApprovalRules | null;
  intelligenceSignalType: string | null;
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
  checklistItems: TaskChecklistItemReadModel[];
  activityHistory: TaskActivityReadModel[];
  appointmentLinks: TaskAppointmentLinkReadModel[];
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

function normalizeChecklistItems(snapshot: unknown): TaskTemplateChecklistItem[] {
  if (!isPlainObject(snapshot) || !Array.isArray(snapshot.checklistItems)) {
    return [];
  }

  return snapshot.checklistItems.flatMap((entry) => {
    if (!isPlainObject(entry) || typeof entry.key !== "string" || typeof entry.label !== "string") {
      return [];
    }

    return [
      {
        key: entry.key,
        label: entry.label,
        description:
          typeof entry.description === "string" && entry.description.trim() ? entry.description.trim() : null,
        required: entry.required !== false
      } satisfies TaskTemplateChecklistItem
    ];
  });
}

function normalizeCompletionCriteria(snapshot: unknown): TaskTemplateCompletionCriteria | null {
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

function normalizeApprovalRules(snapshot: unknown): TaskTemplateApprovalRules | null {
  if (!isPlainObject(snapshot) || !isPlainObject(snapshot.approvalRules)) {
    return null;
  }

  const rules = snapshot.approvalRules;

  if (typeof rules.mode !== "string") {
    return null;
  }

  return {
    mode: rules.mode === "manager_review" ? "manager_review" : "none",
    readyForReviewRequired: rules.readyForReviewRequired === true
  };
}

function normalizeIntelligenceSignalType(snapshot: unknown) {
  if (!isPlainObject(snapshot) || typeof snapshot.intelligenceSignalType !== "string") {
    return null;
  }

  const value = snapshot.intelligenceSignalType.trim();

  return value || null;
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
  const snapshot = (task as { templateSnapshot?: unknown }).templateSnapshot;
  const updateFieldValues = (task as { updateFieldValues?: unknown }).updateFieldValues;
  const checklistItems = (task as { checklistItems?: TaskReadRecord["checklistItems"] }).checklistItems ?? [];
  const activityEvents = (task as {
    activityEvents?: Array<{
      id: string;
      eventType: string;
      message: string;
      createdAt: Date;
      actorUser: {
        id: string;
        name: string;
        email: string;
      } | null;
    }>;
  }).activityEvents;
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
    priority: task.priority,
    dueAt: task.dueAt.toISOString(),
    workflowArea: task.workflowArea,
    sourceType: task.sourceType,
    requiresManagerApproval: task.requiresManagerApproval,
    requiredUpdateFields: normalizeRequiredUpdateFields(snapshot),
    updateFieldValues: normalizeUpdateFieldValues(updateFieldValues),
    templateChecklistItems: normalizeChecklistItems(snapshot),
    completionCriteria: normalizeCompletionCriteria(snapshot),
    approvalRules: normalizeApprovalRules(snapshot),
    intelligenceSignalType: normalizeIntelligenceSignalType(snapshot),
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
    checklistItems: checklistItems.map((item) => ({
      id: item.id,
      kind: item.kind,
      key: item.key,
      label: item.label.trim(),
      required: item.isRequired,
      completed: item.completed,
      sortOrder: item.sortOrder,
      completedAt: item.completedAt?.toISOString() ?? null,
      completedByUserId: item.completedByUserId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    })),
    activityHistory: (activityEvents ?? []).map((event) => ({
      id: event.id,
      eventType: event.eventType,
      message: event.message.trim(),
      createdAt: event.createdAt.toISOString(),
      actor: toUserSummary(event.actorUser)
    })),
    appointmentLinks: (task.appointmentLinks ?? []).map((link) => ({
      id: link.id,
      appointmentId: link.appointment.id,
      appointmentNumber: link.appointment.appointmentNumber,
      appointmentTitle: link.appointment.title,
      startsAt: link.appointment.startsAt?.toISOString() ?? null,
      endsAt: link.appointment.endsAt?.toISOString() ?? null,
      bookingStatus: link.appointment.bookingStatus,
      attendanceStatus: link.appointment.attendanceStatus,
      executionStatus: link.appointment.executionStatus,
      followUpDispositionCode: link.appointment.followUpDispositionCode,
      linkType: link.linkType,
      linkCode: link.linkCode,
      linkTitle: link.title.trim(),
      explanation: normalizeOptionalText(link.explanation),
      isRequired: link.isRequired,
      blocksAppointment: link.blocksAppointment,
      blocksTask: link.blocksTask,
      createdAt: link.createdAt.toISOString()
    })),
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
