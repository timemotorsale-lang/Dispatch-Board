import { Prisma, TaskChecklistItemKind } from "@prisma/client";

import {
  isKnownAdaptiveChecklistLabel,
  isKnownAdaptiveSubtaskLabel
} from "@/lib/adaptive-task-checklist";
import {
  normalizeTaskExecutionAssurance,
  type TaskPlanReviewStatus
} from "@/lib/task-execution-assurance";
import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { canUpdateAssignedWork } from "@/server/policies/access";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";

type TaskPlanReviewAction = "CONFIRM" | "SIMPLIFY" | "BYPASS";

const genericGeneratedSubtaskLabels = new Set([
  "Review task objective",
  "Post progress update",
  "Resolve blocker or assign next step",
  "Confirm next execution step",
  "Move to Ready for Review"
]);

const simplifiedPlanItems = [
  {
    kind: TaskChecklistItemKind.DEFINITION_OF_DONE,
    key: "staff_plan_record_outcome",
    label: "Record what happened and the final outcome",
    isRequired: true
  },
  {
    kind: TaskChecklistItemKind.SUBTASK,
    key: "staff_plan_complete_next_action",
    label: "Complete the next action",
    isRequired: true
  },
  {
    kind: TaskChecklistItemKind.SUBTASK,
    key: "staff_plan_next_owner_or_close",
    label: "Set the next owner or close the task",
    isRequired: true
  }
];

function normalizeTaskId(taskId: string) {
  const normalized = taskId.trim();
  if (!normalized) throw new Error("Task id is required.");
  return normalized;
}

function normalizeAction(input: unknown): TaskPlanReviewAction {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Task plan review payload must be an object.");
  }

  const action = (input as { action?: unknown }).action;
  if (action === "CONFIRM" || action === "SIMPLIFY" || action === "BYPASS") return action;
  throw new Error("Task plan review action is not supported.");
}

function requireUser(user: AuthenticatedUser | null) {
  if (!user) throw new Error("Authentication required.");
  return user;
}

function canManagePlan(
  user: AuthenticatedUser,
  task: { assignedUserId: string; requiresManagerApproval: boolean }
) {
  if (!canUpdateAssignedWork({
    actor: user,
    assignedUserId: task.assignedUserId,
    requiresManagerApproval: task.requiresManagerApproval,
    requestedAction: "status"
  })) {
    throw new Error("You do not have permission to update this task plan.");
  }
}

function isGeneratedPlanItem(item: { kind: TaskChecklistItemKind; label: string }) {
  if (item.kind === TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE) {
    return isKnownAdaptiveChecklistLabel(item.label);
  }

  if (item.kind === TASK_CHECKLIST_ITEM_KIND.SUBTASK) {
    return genericGeneratedSubtaskLabels.has(item.label) || isKnownAdaptiveSubtaskLabel(item.label);
  }

  return false;
}

function statusForAction(action: TaskPlanReviewAction): TaskPlanReviewStatus {
  if (action === "SIMPLIFY") return "SIMPLIFIED";
  if (action === "BYPASS") return "BYPASSED";
  return "CONFIRMED";
}

function noteForAction(action: TaskPlanReviewAction) {
  if (action === "SIMPLIFY") {
    return "Staff replaced the generated suggestion with a basic working plan.";
  }

  if (action === "BYPASS") {
    return "Staff chose to use progress updates instead of generated plan items.";
  }

  return "Staff accepted the suggested subtasks and checklist.";
}

export async function reviewTaskExecutionPlan(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown
) {
  const authenticatedUser = requireUser(user);
  const normalizedTaskId = normalizeTaskId(taskId);
  const action = normalizeAction(input);
  const reviewedAt = new Date();

  const task = await prisma.task.findUnique({
    where: { id: normalizedTaskId },
    select: {
      id: true,
      boardDayId: true,
      title: true,
      assignedUserId: true,
      requiresManagerApproval: true,
      executionAssurance: true,
      checklistItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          kind: true,
          label: true,
          sortOrder: true
        }
      }
    }
  });

  if (!task) throw new Error("Task not found.");
  canManagePlan(authenticatedUser, task);

  const assurance = normalizeTaskExecutionAssurance(task.executionAssurance);
  const generatedItems = task.checklistItems.filter(isGeneratedPlanItem);
  const status = statusForAction(action);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let createdCount = 0;
    let removedCount = 0;

    if (action === "SIMPLIFY") {
      if (generatedItems.length) {
        await tx.taskChecklistItem.deleteMany({
          where: {
            taskId: task.id,
            id: { in: generatedItems.map((item) => item.id) }
          }
        });
        removedCount = generatedItems.length;
      }

      const maxSortOrder = Math.max(
        -1,
        ...task.checklistItems
          .filter((item) => !generatedItems.some((generated) => generated.id === item.id))
          .map((item) => item.sortOrder)
      );

      await tx.taskChecklistItem.createMany({
        data: simplifiedPlanItems.map((item, index) => ({
          taskId: task.id,
          kind: item.kind,
          key: item.key,
          label: item.label,
          isRequired: item.isRequired,
          completed: false,
          sortOrder: maxSortOrder + index + 1
        })),
        skipDuplicates: true
      });
      createdCount = simplifiedPlanItems.length;
    }

    const updatedTask = await tx.task.update({
      where: { id: task.id },
      data: {
        executionAssurance: {
          ...assurance,
          planReview: {
            status,
            reviewedAt: reviewedAt.toISOString(),
            reviewedByUserId: authenticatedUser.id,
            reviewedByName: authenticatedUser.name,
            note: noteForAction(action)
          }
        } satisfies Prisma.InputJsonObject
      },
      select: {
        id: true,
        executionAssurance: true
      }
    });

    return {
      createdCount,
      removedCount,
      executionAssurance: normalizeTaskExecutionAssurance(updatedTask.executionAssurance)
    };
  });

  await recordBoardActivityEvent({
    boardDayId: task.boardDayId,
    actorUserId: authenticatedUser.id,
    taskId: task.id,
    eventType: `task.plan_${status.toLowerCase()}`,
    message: `${authenticatedUser.name} ${action === "SIMPLIFY" ? "selected a basic working plan" : action === "BYPASS" ? "chose updates only" : "kept the suggested plan"} for ${task.title}.`,
    metadata: {
      action,
      status,
      createdCount: result.createdCount,
      removedCount: result.removedCount
    }
  });

  return {
    taskId: task.id,
    executionAssurance: result.executionAssurance,
    planReview: result.executionAssurance.planReview,
    createdCount: result.createdCount,
    removedCount: result.removedCount
  };
}
