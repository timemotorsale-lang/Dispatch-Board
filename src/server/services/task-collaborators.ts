import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { createTaskCollaboratorRepository, type TaskCollaboratorRecord, type TaskCollaboratorRepository } from "@/server/repositories/task-collaborator-repository";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import { normalizeTaskCollaboratorInput } from "@/server/validation/task-collaborators";

function normalizeTaskId(taskId: string) {
  const value = taskId.trim();
  if (!value) throw new Error("Task id is required.");
  return value;
}

function toModel(record: TaskCollaboratorRecord) {
  return {
    id: record.user.id,
    name: record.user.name,
    email: record.user.email || undefined,
    isActive: record.user.isActive,
    addedAt: record.createdAt.toISOString(),
    addedBy: record.addedByUser,
    collaborationScope: record.collaborationScope,
    capacityRequested: record.capacityRequested
  };
}

export async function listTaskCollaborators(user: AuthenticatedUser | null, taskId: string, repository: TaskCollaboratorRepository = createTaskCollaboratorRepository()) {
  if (!user) throw new Error("Authentication required.");
  const id = normalizeTaskId(taskId);
  if (!(await repository.findTaskById(id))) throw new Error("Task not found.");
  return (await repository.listForTask(id)).map(toModel);
}

export async function replaceTaskCollaborators(user: AuthenticatedUser | null, taskId: string, input: unknown, repository: TaskCollaboratorRepository = createTaskCollaboratorRepository()) {
  if (!user) throw new Error("Authentication required.");
  const id = normalizeTaskId(taskId);
  const task = await repository.findTaskById(id);
  if (!task) throw new Error("Task not found.");
  if (!isManager(user) && task.assignedUserId !== user.id && task.ownerUserId !== user.id) throw new Error("Only the task owner, assignee, or a manager can manage collaborators.");

  const { collaboratorIds, collaboratorRequests } = normalizeTaskCollaboratorInput(input);
  if (collaboratorIds.includes(task.assignedUserId)) throw new Error("The task assignee cannot also be a collaborator.");
  const activeUsers = await repository.findActiveUsersByIds(collaboratorIds);
  if (activeUsers.length !== collaboratorIds.length) throw new Error("Every collaborator must be an active staff member.");

  const previous = await repository.listForTask(id);
  const previousIds = new Set(previous.map((item) => item.userId));
  const nextIds = new Set(collaboratorIds);
  const collaborators = await repository.replace(id, collaboratorRequests, user.id);
  const added = collaborators.filter((item) => !previousIds.has(item.userId));
  const removed = previous.filter((item) => !nextIds.has(item.userId));

  if (added.length || removed.length) {
    await recordBoardActivityEvent({
      boardDayId: task.boardDayId, actorUserId: user.id, taskId: id,
      eventType: "task.collaborators_updated",
      message: `${user.name} updated collaborators on ${task.title}.`,
      metadata: {
        addedUserIds: added.map((item) => item.userId),
        removedUserIds: removed.map((item) => item.userId),
        collaboratorCount: collaborators.length,
        collaboratorRequests: collaboratorRequests.map((request) => ({
          userId: request.userId,
          collaborationScope: request.collaborationScope,
          ...(request.capacityRequested ? { capacityRequested: request.capacityRequested } : {})
        }))
      }
    });
  }
  return collaborators.map(toModel);
}
