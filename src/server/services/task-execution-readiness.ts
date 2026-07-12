import { TaskStatus } from "@prisma/client";

import { getStaffExecutionFlags, type StaffExecutionFlags } from "@/lib/staff-execution-flags";
import type { AuthenticatedUser } from "@/server/auth/store";
import { canUpdateAssignedWork, isManager } from "@/server/policies/access";
import {
  createTaskExecutionRepository,
  type TaskExecutionRecord,
  type TaskExecutionRepository
} from "@/server/repositories/task-execution-repository";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";

type Dependencies = {
  flags?: StaffExecutionFlags;
  now?: () => Date;
  recordActivity?: typeof recordBoardActivityEvent;
  repository?: TaskExecutionRepository;
};

function requireUser(actor: AuthenticatedUser | null) {
  if (!actor) throw new Error("Authentication required.");
  return actor;
}

function assertCanUseTask(actor: AuthenticatedUser, task: TaskExecutionRecord) {
  if (!canUpdateAssignedWork({ actor, assignedUserId: task.assignedUserId, requiresManagerApproval: task.requiresManagerApproval, requestedAction: "status" })) {
    throw new Error("You do not have permission to update this task.");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredFieldLabels(task: TaskExecutionRecord) {
  if (!isObject(task.templateSnapshot) || !Array.isArray(task.templateSnapshot.requiredUpdateFields)) return [];
  const values = isObject(task.updateFieldValues) ? task.updateFieldValues : {};
  return task.templateSnapshot.requiredUpdateFields.flatMap((field) => {
    if (!isObject(field) || field.required === false || typeof field.key !== "string" || typeof field.label !== "string") return [];
    const value = values[field.key];
    return typeof value === "boolean" || typeof value === "string" && value.trim() ? [] : [field.label];
  });
}

export function evaluateTaskCompletionReadiness(task: TaskExecutionRecord) {
  const requirements: Array<{ code: string; label: string; satisfied: boolean }> = [];
  for (const item of task.checklistItems.filter((entry) => entry.isRequired)) {
    requirements.push({ code: `checklist:${item.key ?? item.label}`, label: item.label, satisfied: item.completed });
  }
  for (const label of requiredFieldLabels(task)) {
    requirements.push({ code: `update:${label}`, label: `Provide ${label}`, satisfied: false });
  }
  if (task.blockerReason || task.status === TaskStatus.BLOCKED) {
    requirements.push({ code: "blocker", label: "Resolve the active blocker", satisfied: false });
  }
  const dependencyCodes = task.concernLink && Array.isArray(task.concernLink.dependsOnStepCodes)
    ? task.concernLink.dependsOnStepCodes.filter((value): value is string => typeof value === "string")
    : [];
  for (const code of dependencyCodes) {
    const dependency = task.concernLink?.concernCase.taskLinks.find((link) => link.stepCode === code);
    requirements.push({ code: `dependency:${code}`, label: `Complete dependency ${code}`, satisfied: dependency?.task.status === TaskStatus.COMPLETED });
  }
  return {
    accepted: Boolean(task.acceptedAt),
    acceptedAt: task.acceptedAt?.toISOString() ?? null,
    completionOverride: task.completionOverrideAt ? {
      at: task.completionOverrideAt.toISOString(),
      reason: task.completionOverrideReason ?? "Manager override recorded."
    } : null,
    nextCompletionStatus: task.requiresManagerApproval ? TaskStatus.READY_FOR_REVIEW : TaskStatus.COMPLETED,
    ready: requirements.every((requirement) => requirement.satisfied),
    requirements,
    taskId: task.id
  };
}

export async function overrideTaskCompletion(actor: AuthenticatedUser | null, taskId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = requireUser(actor);
  requireFlag(dependencies);
  if (!isManager(user)) throw new Error("Manager access is required to override completion evidence.");
  const candidate = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const reason = typeof candidate.reason === "string" ? candidate.reason.trim() : "";
  if (reason.length < 10) throw new Error("Completion overrides require a reason of at least 10 characters.");
  const repository = dependencies.repository ?? createTaskExecutionRepository();
  const task = await repository.findTask(taskId.trim());
  if (!task) throw new Error("Task not found.");
  const overriddenAt = (dependencies.now ?? (() => new Date()))();
  const overridden = await repository.overrideCompletion(task.id, user.id, reason, overriddenAt);
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: task.boardDayId,
    eventType: "task.completion_override_recorded",
    message: `${user.name} authorized a completion evidence override for ${task.title}: ${reason}`,
    metadata: { reason },
    taskId: task.id
  });
  return evaluateTaskCompletionReadiness(overridden);
}

export type TaskCompletionReadiness = ReturnType<typeof evaluateTaskCompletionReadiness>;

function requireFlag(dependencies: Dependencies) {
  const flags = dependencies.flags ?? getStaffExecutionFlags();
  if (!flags.enabled || !flags.taskAcceptanceEnabled) throw new Error("Task acceptance is not enabled.");
}

export async function getTaskCompletionReadiness(actor: AuthenticatedUser | null, taskId: string, dependencies: Dependencies = {}) {
  const user = requireUser(actor);
  requireFlag(dependencies);
  const repository = dependencies.repository ?? createTaskExecutionRepository();
  const task = await repository.findTask(taskId.trim());
  if (!task) throw new Error("Task not found.");
  assertCanUseTask(user, task);
  return evaluateTaskCompletionReadiness(task);
}

export async function acceptTask(actor: AuthenticatedUser | null, taskId: string, dependencies: Dependencies = {}) {
  const user = requireUser(actor);
  requireFlag(dependencies);
  const repository = dependencies.repository ?? createTaskExecutionRepository();
  const task = await repository.findTask(taskId.trim());
  if (!task) throw new Error("Task not found.");
  assertCanUseTask(user, task);
  if (task.acceptedAt) return evaluateTaskCompletionReadiness(task);
  const acceptedAt = (dependencies.now ?? (() => new Date()))();
  const accepted = await repository.acceptTask(task.id, user.id, acceptedAt);
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    actorUserId: user.id,
    boardDayId: task.boardDayId,
    eventType: "task.accepted",
    message: `${user.name} accepted ${task.title}.`,
    metadata: { acceptedAt: acceptedAt.toISOString() },
    taskId: task.id
  });
  return evaluateTaskCompletionReadiness(accepted);
}
