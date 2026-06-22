import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageAssignments } from "@/server/policies/access";
import { createTaskAssignmentRepository, type TaskAssignmentRepository } from "@/server/repositories/task-assignment-repository";
import { normalizeTaskAssignmentInput } from "@/server/validation/task-assignment";

export async function assignTask(user: AuthenticatedUser | null, taskId: string, input: unknown, repository: TaskAssignmentRepository = createTaskAssignmentRepository()) {
  if (!user) throw new Error("Authentication required.");
  if (!canManageAssignments(user)) throw new Error("You do not have permission to assign tasks.");
  const id = taskId.trim();
  if (!id) throw new Error("Task id is required.");
  const normalized = normalizeTaskAssignmentInput(input);
  const task = await repository.findTaskById(id);
  if (!task) throw new Error("Task not found.");

  const assignedUserId = normalized.mode === "accept_recommendation" ? task.recommendedUserId : normalized.assignedUserId;
  if (!assignedUserId) throw new Error("This task does not have a recommendation to accept.");
  if (!(await repository.isActiveUser(assignedUserId))) throw new Error("Tasks can only be assigned to an active user.");
  if (normalized.mode === "override" && assignedUserId === task.recommendedUserId) {
    throw new Error("Override must select a user other than the recommended user.");
  }
  if (normalized.mode === "reassign" && assignedUserId === task.assignedUserId) {
    throw new Error("Reassignment must select a different user.");
  }

  const updated = await repository.assignWithActivity(id, user.id, assignedUserId, normalized.mode, normalized.reason);
  return { id: updated.id, assignedUserId: updated.assignedUserId, recommendedUserId: updated.recommendedUserId, updatedAt: updated.updatedAt.toISOString() };
}
