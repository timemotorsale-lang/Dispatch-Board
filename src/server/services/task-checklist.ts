import type { AuthenticatedUser } from "@/server/auth/store";
import {
  TASK_CHECKLIST_ITEM_KIND,
  type TaskChecklistItemKindValue
} from "@/lib/task-checklist-kind";
import { canUpdateAssignedWork } from "@/server/policies/access";
import { createTaskChecklistRepository, type TaskChecklistItemRecord, type TaskChecklistRepository } from "@/server/repositories/task-checklist-repository";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import { assertCanViewBoard } from "@/server/services/board-read";
import {
  normalizeTaskChecklistCreateInput,
  normalizeTaskChecklistUpdateInput,
  type NormalizedTaskChecklistCreateInput
} from "@/server/validation/task-checklist";

export type TaskChecklistItemModel = {
  id: string;
  taskId: string;
  kind: TaskChecklistItemKindValue;
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

export type TaskChecklistSeedItem = {
  kind: TaskChecklistItemKindValue;
  label: string;
  completed?: boolean;
  key?: string | null;
  required?: boolean;
};

function normalizeRequiredId(value: string, message: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(message);
  }

  return normalized;
}

function assertCanManageTaskChecklist(
  user: AuthenticatedUser | null,
  task: {
    assignedUserId: string;
    requiresManagerApproval: boolean;
    collaborators?: Array<{ userId: string }>;
  }
) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (
    !task.collaborators?.some((collaborator) => collaborator.userId === user.id) && !canUpdateAssignedWork({
      actor: user,
      assignedUserId: task.assignedUserId,
      requiresManagerApproval: task.requiresManagerApproval,
      requestedAction: "status"
    })
  ) {
    throw new Error("You do not have permission to update this task checklist.");
  }

  return user;
}

function toTaskChecklistItemModel(item: TaskChecklistItemRecord): TaskChecklistItemModel {
  return {
    id: item.id,
    taskId: item.taskId,
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
  };
}

async function requireTaskForChecklist(repository: TaskChecklistRepository, taskId: string) {
  const task = await repository.findTaskById(taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  return task;
}

function buildChecklistCreateMessage(
  actorName: string,
  taskTitle: string,
  input: NormalizedTaskChecklistCreateInput
) {
  if (input.kind === TASK_CHECKLIST_ITEM_KIND.SUBTASK) {
    return `${actorName} added a subtask to ${taskTitle}: ${input.label}.`;
  }

  return `${actorName} added a definition of done item to ${taskTitle}: ${input.label}.`;
}

function buildChecklistUpdateMessage(
  actorName: string,
  taskTitle: string,
  item: TaskChecklistItemRecord,
  completed: boolean
) {
  const itemType =
    item.kind === TASK_CHECKLIST_ITEM_KIND.SUBTASK ? "subtask" : "definition of done item";

  if (completed) {
    return `${actorName} completed a ${itemType} on ${taskTitle}: ${item.label}.`;
  }

  return `${actorName} reopened a ${itemType} on ${taskTitle}: ${item.label}.`;
}

export async function listTaskChecklistItems(
  user: AuthenticatedUser | null,
  taskId: string,
  repository: TaskChecklistRepository = createTaskChecklistRepository()
) {
  assertCanViewBoard(user);

  const normalizedTaskId = normalizeRequiredId(taskId, "Task id is required.");
  await requireTaskForChecklist(repository, normalizedTaskId);

  const items = await repository.listItemsForTask(normalizedTaskId);
  return items.map(toTaskChecklistItemModel);
}

export async function createTaskChecklistItem(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  repository: TaskChecklistRepository = createTaskChecklistRepository()
) {
  const normalizedTaskId = normalizeRequiredId(taskId, "Task id is required.");
  const normalizedInput = normalizeTaskChecklistCreateInput(input);
  const task = await requireTaskForChecklist(repository, normalizedTaskId);
  const authenticatedUser = assertCanManageTaskChecklist(user, task);

  const item = await repository.createItem(normalizedTaskId, normalizedInput);

  if (repository.supportsActivityEvents) {
    await recordBoardActivityEvent({
      boardDayId: task.boardDayId,
      actorUserId: authenticatedUser.id,
      taskId: normalizedTaskId,
      eventType:
        normalizedInput.kind === TASK_CHECKLIST_ITEM_KIND.SUBTASK
          ? "task.subtask_added"
          : "task.definition_of_done_added",
      message: buildChecklistCreateMessage(authenticatedUser.name, task.title, normalizedInput),
      metadata: {
        itemId: item.id,
        kind: item.kind,
        label: item.label
      }
    });
  }

  return toTaskChecklistItemModel(item);
}

export async function updateTaskChecklistItem(
  user: AuthenticatedUser | null,
  taskId: string,
  itemId: string,
  input: unknown,
  repository: TaskChecklistRepository = createTaskChecklistRepository()
) {
  const normalizedTaskId = normalizeRequiredId(taskId, "Task id is required.");
  const normalizedItemId = normalizeRequiredId(itemId, "Task checklist item id is required.");
  const normalizedInput = normalizeTaskChecklistUpdateInput(input);
  const task = await requireTaskForChecklist(repository, normalizedTaskId);
  const authenticatedUser = assertCanManageTaskChecklist(user, task);
  const existingItem = await repository.findItemById(normalizedTaskId, normalizedItemId);

  if (!existingItem) {
    throw new Error("Task checklist item not found.");
  }

  const updatedItem = await repository.updateItem(normalizedTaskId, normalizedItemId, {
    ...normalizedInput,
    completedByUserId: normalizedInput.completed ? authenticatedUser.id : null
  });

  if (repository.supportsActivityEvents) {
    await recordBoardActivityEvent({
      boardDayId: task.boardDayId,
      actorUserId: authenticatedUser.id,
      taskId: normalizedTaskId,
      eventType: normalizedInput.completed ? "task.checklist_completed" : "task.checklist_reopened",
      message: buildChecklistUpdateMessage(
        authenticatedUser.name,
        task.title,
        existingItem,
        normalizedInput.completed
      ),
      metadata: {
        itemId: existingItem.id,
        kind: existingItem.kind,
        label: existingItem.label,
        completed: normalizedInput.completed
      }
    });
  }

  return toTaskChecklistItemModel(updatedItem);
}

export async function seedTaskChecklistItems(
  taskId: string,
  items: TaskChecklistSeedItem[],
  repository: TaskChecklistRepository = createTaskChecklistRepository()
) {
  const normalizedTaskId = normalizeRequiredId(taskId, "Task id is required.");

  if (items.length === 0) {
    return [];
  }

  const existingItems = await repository.listItemsForTask(normalizedTaskId);

  if (existingItems.length > 0) {
    return existingItems.map(toTaskChecklistItemModel);
  }

  const createdItems: TaskChecklistItemModel[] = [];

  for (const item of items) {
    const normalizedLabel = item.label.trim();

    if (!normalizedLabel) {
      continue;
    }

    const createdItem = await repository.createItem(normalizedTaskId, {
      kind: item.kind,
      key: item.key ?? null,
      label: normalizedLabel,
      isRequired: item.required ?? true,
      completed: item.completed ?? false
    });

    createdItems.push(toTaskChecklistItemModel(createdItem));
  }

  return createdItems;
}
