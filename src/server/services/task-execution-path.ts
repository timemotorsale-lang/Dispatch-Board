import { Prisma, TaskChecklistItemKind, WorkflowArea } from "@prisma/client";

import {
  buildAdaptiveTaskChecklist,
  buildAdaptiveTaskSubtasks,
  isKnownAdaptiveChecklistLabel,
  isKnownAdaptiveSubtaskLabel
} from "@/lib/adaptive-task-checklist";
import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { canUpdateAssignedWork } from "@/server/policies/access";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";

type InitiateExecutionPathResult = {
  checklistCreated: number;
  id: string;
  initiatedAt: string;
  removedGeneratedCount: number;
  subtaskCreated: number;
  workflowArea: string;
};

const workflowAreaLabels: Record<WorkflowArea, string> = {
  [WorkflowArea.ADMIN]: "Admin",
  [WorkflowArea.ADVERTISING]: "Advertising",
  [WorkflowArea.COLLECTIONS]: "Collections",
  [WorkflowArea.GENERAL_MANAGER]: "Management",
  [WorkflowArea.INVENTORY]: "Inventory / Parts",
  [WorkflowArea.MARKETING]: "Marketing",
  [WorkflowArea.SALES]: "Sales",
  [WorkflowArea.SERVICE_ADVISOR]: "Service Advisor",
  [WorkflowArea.SHOP]: "Shop & Recon"
};

const genericGeneratedSubtaskLabels = new Set([
  "Review task objective",
  "Post progress update",
  "Resolve blocker or assign next step",
  "Confirm next execution step",
  "Move to Ready for Review"
]);

function normalizeTaskId(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  return normalizedTaskId;
}

function normalizeWorkflowArea(input: unknown) {
  const value = typeof input === "object" && input !== null && "workflowArea" in input
    ? (input as { workflowArea?: unknown }).workflowArea
    : undefined;

  if (typeof value !== "string" || !(value in WorkflowArea)) {
    throw new Error("Task path initiation requires a valid execution path.");
  }

  return value as WorkflowArea;
}

function assertCanInitiatePath(
  user: AuthenticatedUser | null,
  task: { assignedUserId: string; requiresManagerApproval: boolean }
) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (
    !canUpdateAssignedWork({
      actor: user,
      assignedUserId: task.assignedUserId,
      requiresManagerApproval: task.requiresManagerApproval,
      requestedAction: "status"
    })
  ) {
    throw new Error("You do not have permission to update this task.");
  }

  return user;
}

function isGeneratedPathItem(item: { completed: boolean; kind: TaskChecklistItemKind; label: string }) {
  if (item.completed) return false;

  if (item.kind === TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE) {
    return isKnownAdaptiveChecklistLabel(item.label);
  }

  if (item.kind === TASK_CHECKLIST_ITEM_KIND.SUBTASK) {
    return genericGeneratedSubtaskLabels.has(item.label) || isKnownAdaptiveSubtaskLabel(item.label);
  }

  return false;
}

function buildItemData(input: {
  items: Array<{ key: string; label: string }>;
  existingLabels: Set<string>;
  kind: TaskChecklistItemKind;
  keyPrefix: string;
  sortOrderStart: number;
  taskId: string;
}) {
  let sortOrder = input.sortOrderStart;

  return input.items
    .filter((item) => !input.existingLabels.has(item.label))
    .map((item) => ({
      taskId: input.taskId,
      kind: input.kind,
      key: `${input.keyPrefix}_${item.key}`,
      label: item.label,
      isRequired: true,
      completed: false,
      sortOrder: ++sortOrder
    }));
}

export async function initiateTaskExecutionPath(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown
): Promise<InitiateExecutionPathResult> {
  const normalizedTaskId = normalizeTaskId(taskId);
  const workflowArea = normalizeWorkflowArea(input);
  const initiatedAt = new Date();

  const task = await prisma.task.findUnique({
    where: { id: normalizedTaskId },
    select: {
      id: true,
      boardDayId: true,
      title: true,
      description: true,
      assignedUserId: true,
      requiresManagerApproval: true,
      workflowArea: true,
      checklistItems: {
        select: {
          id: true,
          kind: true,
          key: true,
          label: true,
          completed: true,
          sortOrder: true
        }
      }
    }
  });

  if (!task) {
    throw new Error("Task not found.");
  }

  const authenticatedUser = assertCanInitiatePath(user, task);
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (task.workflowArea !== workflowArea) {
      await tx.task.update({
        where: { id: task.id },
        data: { workflowArea }
      });
    }

    const generatedItemsToRemove = task.checklistItems.filter(isGeneratedPathItem);

    if (generatedItemsToRemove.length > 0) {
      await tx.taskChecklistItem.deleteMany({
        where: {
          taskId: task.id,
          id: { in: generatedItemsToRemove.map((item) => item.id) }
        }
      });
    }

    const preservedItems = task.checklistItems.filter(
      (item) => !generatedItemsToRemove.some((generatedItem) => generatedItem.id === item.id)
    );
    const existingLabels = new Set(preservedItems.map((item) => item.label));
    const maxChecklistSort = Math.max(
      -1,
      ...preservedItems
        .filter((item) => item.kind === TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE)
        .map((item) => item.sortOrder)
    );
    const maxSubtaskSort = Math.max(
      -1,
      ...preservedItems
        .filter((item) => item.kind === TASK_CHECKLIST_ITEM_KIND.SUBTASK)
        .map((item) => item.sortOrder)
    );
    const keyPrefix = `initiated_${workflowArea.toLowerCase()}`;
    const checklistData = buildItemData({
      taskId: task.id,
      kind: TaskChecklistItemKind.DEFINITION_OF_DONE,
      keyPrefix,
      sortOrderStart: maxChecklistSort,
      existingLabels,
      items: buildAdaptiveTaskChecklist({
        title: task.title,
        description: task.description,
        workflowArea
      })
    });
    const subtaskData = buildItemData({
      taskId: task.id,
      kind: TaskChecklistItemKind.SUBTASK,
      keyPrefix,
      sortOrderStart: maxSubtaskSort,
      existingLabels,
      items: buildAdaptiveTaskSubtasks({ workflowArea })
    });

    if (checklistData.length > 0) {
      await tx.taskChecklistItem.createMany({
        data: checklistData,
        skipDuplicates: true
      });
    }

    if (subtaskData.length > 0) {
      await tx.taskChecklistItem.createMany({
        data: subtaskData,
        skipDuplicates: true
      });
    }

    return {
      checklistCreated: checklistData.length,
      subtaskCreated: subtaskData.length,
      removedGeneratedCount: generatedItemsToRemove.length
    };
  });

  await recordBoardActivityEvent({
    boardDayId: task.boardDayId,
    actorUserId: authenticatedUser.id,
    taskId: task.id,
    eventType: "task.execution_path_initiated",
    message: `${authenticatedUser.name} initiated the ${workflowAreaLabels[workflowArea]} path for ${task.title}.`,
    metadata: {
      previousWorkflowArea: task.workflowArea,
      workflowArea,
      checklistCreated: result.checklistCreated,
      subtaskCreated: result.subtaskCreated,
      removedGeneratedCount: result.removedGeneratedCount
    }
  });

  return {
    id: task.id,
    workflowArea,
    initiatedAt: initiatedAt.toISOString(),
    ...result
  };
}
