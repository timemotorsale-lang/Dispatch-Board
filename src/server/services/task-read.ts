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
import {
  getTaskMomentumState,
  normalizeTaskExecutionAssurance,
  type TaskExecutionAssurance,
  type TaskMomentumState
} from "@/lib/task-execution-assurance";
import {
  buildTaskNextActionRecommendation,
  type TaskNextActionRecommendation
} from "@/server/services/task-next-action";

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

export type TaskConcernWorkspaceReadModel = {
  id: string;
  concernNumber: string;
  title: string;
  description: string;
  category: string;
  riskType: string;
  priority: string;
  status: string;
  customerReference: string | null;
  vehicleReference: string | null;
  dueAt: string;
  escalationRequired: boolean;
  escalateAt: string | null;
  createdAt: string;
  reportedByUser: TaskReadUserSummary;
  assignedOwner: TaskReadUserSummary | null;
  selectedStepCode: string;
  selectedStepDependencies: string[];
  selectedStepCompletionCriteria: string;
  tasks: Array<{
    id: string;
    stepCode: string;
    sortOrder: number;
    title: string;
    status: string;
    priority: string;
    dueAt: string;
    required: boolean;
    requiresManagerApproval: boolean;
    dependsOnStepCodes: string[];
    completionCriteria: string;
    assignedUser: TaskReadUserSummary;
    checklistCompleted: number;
    checklistTotal: number;
  }>;
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
  sourceContext: {
    channel: string;
    sourceId: string | null;
    sourceKind: string;
    text: string;
    href: string | null;
  } | null;
  repairOrderHref?: string | null;
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
  executionAssurance: TaskExecutionAssurance & { state: TaskMomentumState };
  nextActionRecommendation?: TaskNextActionRecommendation;
  readyForReviewAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser: TaskReadUserSummary;
  recommendedUser: TaskReadUserSummary | null;
  recommendation: TaskReadRecommendation | null;
  createdByUser: TaskReadUserSummary | null;
  reviewedByUser: TaskReadUserSummary | null;
  collaborators: Array<TaskReadUserSummary & { isActive: boolean; addedAt: string; addedBy: TaskReadUserSummary | null }>;
  checklistItems: TaskChecklistItemReadModel[];
  activityHistory: TaskActivityReadModel[];
  appointmentLinks: TaskAppointmentLinkReadModel[];
  comments: TaskCommentReadModel[];
  concernWorkspace: TaskConcernWorkspaceReadModel | null;
};

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

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
  const conversionContract = snapshot && typeof snapshot === "object" && "conversionContract" in snapshot && snapshot.conversionContract && typeof snapshot.conversionContract === "object"
    ? snapshot.conversionContract as Record<string, unknown>
    : null;
  const origin = conversionContract?.origin && typeof conversionContract.origin === "object"
    ? conversionContract.origin as Record<string, unknown>
    : null;
  const sourceKind = typeof origin?.sourceKind === "string" ? origin.sourceKind : "";
  const sourceId = typeof origin?.sourceId === "string" ? origin.sourceId : null;
  const workbookSource = /workbook/i.test(sourceKind);
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

  const readModel: TaskReadModel = {
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
    sourceContext: origin ? {
      channel: typeof origin.channel === "string" ? origin.channel : "Workbook",
      sourceId,
      sourceKind: sourceKind || "Workbook item",
      text: typeof origin.text === "string" ? origin.text : task.description,
      href: workbookSource ? `/vehicles/coo-workbook/${sourceKind.toLowerCase().includes("quick") ? "quick-update" : sourceKind.toLowerCase().includes("checklist") ? "checklist" : ""}${sourceId ? `#source-${encodeURIComponent(sourceId)}` : ""}` : null
    } : null,
    repairOrderHref: task.sourceType === "REPAIR_ORDER" && snapshot && typeof snapshot === "object" &&
      "repairOrderId" in snapshot && typeof snapshot.repairOrderId === "string"
      ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(snapshot.repairOrderId)}`
      : null,
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
    executionAssurance: {
      ...normalizeTaskExecutionAssurance(task.executionAssurance),
      state: getTaskMomentumState(task.status, task.executionAssurance)
    },
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
    collaborators: (task.collaborators ?? []).map((collaborator) => ({
      id: collaborator.user.id,
      name: collaborator.user.name,
      email: collaborator.user.email || undefined,
      isActive: collaborator.user.isActive,
      addedAt: collaborator.createdAt.toISOString(),
      addedBy: toUserSummary(collaborator.addedByUser)
    })),
    concernWorkspace: task.concernLink ? {
      id: task.concernLink.concernCase.id,
      concernNumber: task.concernLink.concernCase.concernNumber,
      title: task.concernLink.concernCase.title,
      description: task.concernLink.concernCase.description,
      category: task.concernLink.concernCase.category,
      riskType: task.concernLink.concernCase.riskType,
      priority: task.concernLink.concernCase.priority,
      status: task.concernLink.concernCase.status,
      customerReference: normalizeOptionalText(task.concernLink.concernCase.customerReference),
      vehicleReference: normalizeOptionalText(task.concernLink.concernCase.vehicleReference),
      dueAt: task.concernLink.concernCase.dueAt.toISOString(),
      escalationRequired: task.concernLink.concernCase.escalationRequired,
      escalateAt: task.concernLink.concernCase.escalateAt?.toISOString() ?? null,
      createdAt: task.concernLink.concernCase.createdAt.toISOString(),
      reportedByUser: toUserSummary(task.concernLink.concernCase.reportedByUser)!,
      assignedOwner: toUserSummary(task.concernLink.concernCase.assignedOwner),
      selectedStepCode: task.concernLink.stepCode,
      selectedStepDependencies: normalizeStringArray(task.concernLink.dependsOnStepCodes),
      selectedStepCompletionCriteria: task.concernLink.completionCriteria,
      tasks: task.concernLink.concernCase.taskLinks.map((link) => ({
        id: link.task.id,
        stepCode: link.stepCode,
        sortOrder: link.sortOrder,
        title: link.task.title,
        status: link.task.status,
        priority: link.task.priority,
        dueAt: link.task.dueAt.toISOString(),
        required: link.required,
        requiresManagerApproval: link.task.requiresManagerApproval,
        dependsOnStepCodes: normalizeStringArray(link.dependsOnStepCodes),
        completionCriteria: link.completionCriteria,
        assignedUser: {
          id: link.task.assignedUser.id,
          name: link.task.assignedUser.name,
          email: link.task.assignedUser.email || undefined
        },
        checklistCompleted: link.task.checklistItems.filter((item) => item.completed).length,
        checklistTotal: link.task.checklistItems.length
      }))
    } : null,
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

  return {
    ...readModel,
    nextActionRecommendation: buildTaskNextActionRecommendation(readModel)
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
