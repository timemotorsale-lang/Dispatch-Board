import { TaskStatus, WorkflowArea } from "@prisma/client";

import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import { buildAdaptiveTaskChecklist } from "@/lib/adaptive-task-checklist";
import type { ActivityFeedEvent } from "@/server/services/activity-feed";
import type { TaskReadModel } from "@/server/services/task-read";

export type TaskDetailChecklistItem = {
  completed: boolean;
  id: string;
  label: string;
};

export type TaskDetailSubtaskItem = {
  completed: boolean;
  id: string;
  label: string;
};

export type TaskDetailTag = {
  id: string;
  label: string;
};

export type TaskDetailAssociatedUnit = {
  ownershipType?: "internal" | "customer";
  stockNumber?: string;
  summary: string;
  vin?: string;
};

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatTaskEnumLabel(value: string) {
  return normalizeWords(value);
}

export function formatTaskDisplayNumber(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    return "TMS-0000";
  }

  if (/^tms-/i.test(normalizedTaskId)) {
    return normalizedTaskId.toUpperCase();
  }

  const compactTaskId = normalizedTaskId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return `TMS-${compactTaskId.slice(-6)}`;
}

export function formatTaskDetailDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function buildDefinitionOfDone(task: TaskReadModel): TaskDetailChecklistItem[] {
  const persistedItems = task.checklistItems
    .filter((item) => item.kind === TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE)
    .map((item) => ({
      id: item.id,
      label: item.label,
      completed: item.completed
    }));

  if (persistedItems.length > 0) {
    return persistedItems;
  }

  if (task.templateChecklistItems?.length) {
    return task.templateChecklistItems.map((item) => ({
      id: `${task.id}-template-${item.key}`,
      label: item.label,
      completed: false
    }));
  }

  return buildAdaptiveTaskChecklist(task).map((item) => ({
    id: `${task.id}-adaptive-${item.key}`,
    label: item.label,
    completed: false
  }));
}

export function buildSubtasks(task: TaskReadModel): TaskDetailSubtaskItem[] {
  const persistedItems = task.checklistItems
    .filter((item) => item.kind === TASK_CHECKLIST_ITEM_KIND.SUBTASK)
    .map((item) => ({
      id: item.id,
      label: item.label,
      completed: item.completed
    }));

  if (persistedItems.length > 0) {
    return persistedItems;
  }

  const baseItems: TaskDetailSubtaskItem[] = [
    {
      id: `${task.id}-subtask-review`,
      label: "Review task objective",
      completed: task.status !== TaskStatus.NOT_STARTED
    },
    {
      id: `${task.id}-subtask-progress`,
      label: "Post progress update",
      completed: task.comments.length > 0
    }
  ];

  if (task.blockerReason) {
    baseItems.push({
      id: `${task.id}-subtask-blocker`,
      label: "Resolve blocker or assign next step",
      completed: false
    });
  } else {
    baseItems.push({
      id: `${task.id}-subtask-next`,
      label: "Confirm next execution step",
      completed: task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.COMPLETED
    });
  }

  if (task.vehicleReference) {
    baseItems.push({
      id: `${task.id}-subtask-vehicle`,
      label: `Review ${task.vehicleReference}`,
      completed: task.status !== TaskStatus.NOT_STARTED
    });
  }

  if (task.customerReference) {
    baseItems.push({
      id: `${task.id}-subtask-customer`,
      label: `Confirm ${task.customerReference}`,
      completed: task.status !== TaskStatus.NOT_STARTED
    });
  }

  if (task.requiresManagerApproval) {
    baseItems.push({
      id: `${task.id}-subtask-review-stage`,
      label: "Move to Ready for Review",
      completed: Boolean(task.readyForReviewAt || task.completedAt)
    });
  }

  return baseItems;
}

export function buildInitialChecklistSeed(task: TaskReadModel) {
  return [
    ...buildDefinitionOfDone(task).map((item) => ({
      kind: TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE,
      label: item.label,
      completed: item.completed
    })),
    ...buildSubtasks(task).map((item) => ({
      kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
      label: item.label,
      completed: item.completed
    }))
  ];
}

export function buildTaskTags(task: TaskReadModel): TaskDetailTag[] {
  const tags: TaskDetailTag[] = [
    {
      id: `${task.id}-workflow`,
      label: formatTaskEnumLabel(task.workflowArea)
    },
    {
      id: `${task.id}-source`,
      label: formatTaskEnumLabel(task.sourceType)
    }
  ];

  if (task.vehicleReference) {
    tags.push({
      id: `${task.id}-vehicle`,
      label: task.vehicleReference
    });
  }

  if (task.customerReference) {
    tags.push({
      id: `${task.id}-customer`,
      label: task.customerReference
    });
  }

  if (task.requiresManagerApproval) {
    tags.push({
      id: `${task.id}-review`,
      label: "Review Required"
    });
  }

  return tags;
}

export function buildAssociatedUnit(task: TaskReadModel): TaskDetailAssociatedUnit | null {
  if (!task.vehicleReference && !task.customerReference) {
    return null;
  }

  if (task.vehicleReference) {
    return {
      ownershipType: "internal",
      stockNumber: task.vehicleReference,
      summary: task.vehicleReference
    };
  }

  return {
    ownershipType: "customer",
    summary: task.customerReference ?? "Customer-linked task"
  };
}

export function buildPlanningFields(task: TaskReadModel) {
  const estimatedTime =
    task.workflowArea === WorkflowArea.SHOP ? "8 hours" : task.workflowArea === WorkflowArea.GENERAL_MANAGER ? "30 minutes" : "2 hours";

  return {
    actualTime: task.completedAt ? "Completed" : "Open",
    estimatedTime,
    maxRecommendedBidCap: task.workflowArea === WorkflowArea.SHOP ? "$850" : null,
    priority: task.status === TaskStatus.BLOCKED ? "High" : task.status === TaskStatus.COMPLETED ? "Normal" : "High"
  };
}

export function buildTaskActivity(events: ActivityFeedEvent[], task: TaskReadModel) {
  const eventItems = events
    .filter((event) => event.task?.id === task.id)
    .map((event) => ({
      id: `event-${event.id}`,
      actorName: event.actor?.name ?? "System",
      createdAt: event.createdAt,
      kind: "event" as const,
      message: event.message
    }));

  const commentItems = task.comments.map((comment) => ({
    id: `comment-${comment.id}`,
    actorName: comment.author.name,
    createdAt: comment.createdAt,
    kind: "comment" as const,
    message: comment.body
  }));

  return [...eventItems, ...commentItems].sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}
