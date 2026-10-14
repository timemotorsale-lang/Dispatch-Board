import type { AuthenticatedUser } from "@/server/auth/store";
import { canUpdateAssignedWork, isManager } from "@/server/policies/access";
import {
  createTaskMetadataRepository,
  type TaskMetadataLookupRecord,
  type TaskMetadataRepository
} from "@/server/repositories/task-metadata-repository";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import {
  normalizeTaskMetadataUpdateInput,
  type NormalizedTaskMetadataUpdateInput
} from "@/server/validation/task-metadata";

export type TaskMetadataUpdateResult = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  vehicleReference: string | null;
  customerReference: string | null;
  updatedAt: string;
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

function assertCanUpdateTaskMetadata(
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
      requestedAction: "status"
    })
  ) {
    throw new Error("You do not have permission to update this task.");
  }

  return user;
}

function assertCanUpdateDueAt(
  user: AuthenticatedUser,
  input: NormalizedTaskMetadataUpdateInput
) {
  if (input.dueAt !== undefined && !isManager(user)) {
    throw new Error("Only managers can change the due date.");
  }
}

function buildMetadataChangeSummary(
  previousTask: TaskMetadataLookupRecord,
  nextInput: NormalizedTaskMetadataUpdateInput
) {
  const changes: string[] = [];

  if (
    nextInput.title !== undefined &&
    nextInput.title !== previousTask.title
  ) {
    changes.push("updated the title");
  }

  if (
    nextInput.description !== undefined &&
    nextInput.description !== previousTask.description
  ) {
    changes.push("updated the description");
  }

  if (
    nextInput.vehicleReference !== undefined &&
    nextInput.vehicleReference !== previousTask.vehicleReference
  ) {
    changes.push(nextInput.vehicleReference ? "updated the stock/unit reference" : "cleared the stock/unit reference");
  }

  if (
    nextInput.customerReference !== undefined &&
    nextInput.customerReference !== previousTask.customerReference
  ) {
    changes.push(nextInput.customerReference ? "updated the customer reference" : "cleared the customer reference");
  }

  if (
    nextInput.dueAt !== undefined &&
    nextInput.dueAt.getTime() !== previousTask.dueAt.getTime()
  ) {
    changes.push("changed the due date");
  }

  return changes;
}

function toTaskMetadataUpdateResult(task: TaskMetadataLookupRecord): TaskMetadataUpdateResult {
  return {
    id: task.id,
    title: task.title,
    description: normalizeOptionalText(task.description),
    dueAt: task.dueAt.toISOString(),
    vehicleReference: normalizeOptionalText(task.vehicleReference),
    customerReference: normalizeOptionalText(task.customerReference),
    updatedAt: task.updatedAt.toISOString()
  };
}

export async function updateTaskMetadata(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  repository: TaskMetadataRepository = createTaskMetadataRepository()
) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedInput = normalizeTaskMetadataUpdateInput(input);
  const task = await repository.findTaskById(normalizedTaskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  const authenticatedUser = assertCanUpdateTaskMetadata(user, task);
  assertCanUpdateDueAt(authenticatedUser, normalizedInput);
  const changes = buildMetadataChangeSummary(task, normalizedInput);
  const previousTaskTitle = task.title;

  if (changes.length === 0) {
    throw new Error("Task metadata updates did not change any saved fields.");
  }

  const updatedTask = await repository.updateTaskMetadata(normalizedTaskId, normalizedInput);

  if (repository.supportsActivityEvents) {
    await recordBoardActivityEvent({
      boardDayId: task.boardDayId,
      actorUserId: authenticatedUser.id,
      taskId: task.id,
      eventType: "task.metadata_updated",
      message: `${authenticatedUser.name} ${changes.join(", ")} on ${previousTaskTitle}.`,
      metadata: {
        changedFields: changes
      }
    });
  }

  return toTaskMetadataUpdateResult(updatedTask);
}
